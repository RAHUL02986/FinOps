const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { SalarySlip, PayrollRun } = require('../models/Payroll');
const User = require('../models/User');
const SmtpConfig = require('../models/SmtpConfig');
const nodemailer = require('nodemailer');
const path = require('path');

router.use(protect);
router.use(authorize('superadmin', 'hr'));

// ======= PAYROLL RUNS =======

// GET all payroll runs
router.get('/runs', async (req, res) => {
  try {
    const runs = await PayrollRun.find()
      .populate('processedBy', 'name email')
      .populate({ path: 'slips', populate: { path: 'employee', select: 'name email designation' } })
      .sort('-year -month');
    res.json(runs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create payroll run
router.post('/runs', async (req, res) => {
  try {
    const { month, year } = req.body;

    // Check if run already exists
    const existing = await PayrollRun.findOne({ month, year });
    if (existing) return res.status(400).json({ message: 'Payroll run already exists for this month/year' });

    // Get all active employees
    const employees = await User.find({ isActive: true, role: { $ne: 'superadmin' } });
    if (employees.length === 0) return res.status(400).json({ message: 'No active employees found' });

    const run = await PayrollRun.create({
      month,
      year,
      processedBy: req.user._id,
      employeeCount: employees.length
    });


    // Generate salary slips for each employee, but only if they have a previous slip
    const slips = [];
    for (const emp of employees) {
      // Find latest slip for this employee
      const latestSlip = await SalarySlip.findOne({ employee: emp._id })
        .sort({ year: -1, month: -1 });

      if (!latestSlip) {
        // Skip employee if no previous salary slip exists
        continue;
      }

      // Copy all fields from the latest slip except _id, month, year, payrollRun, createdAt, updatedAt
      const slipData = latestSlip.toObject();
      delete slipData._id;
      delete slipData.month;
      delete slipData.year;
      delete slipData.payrollRun;
      delete slipData.createdAt;
      delete slipData.updatedAt;
      slipData.month = month;
      slipData.year = year;
      slipData.payrollRun = run._id;
      slipData.employee = emp._id;
      slipData.employeeName = emp.name;
      slipData.employeeEmail = emp.email;

      const slip = await SalarySlip.create(slipData);
      slips.push(slip._id);
    }

    run.slips = slips;
    run.totalAmount = slips.length > 0 ? (await SalarySlip.find({ _id: { $in: slips } })).reduce((sum, s) => sum + s.netSalary, 0) : 0;
    await run.save();

    const populated = await PayrollRun.findById(run._id)
      .populate('processedBy', 'name email')
      .populate({ path: 'slips', populate: { path: 'employee', select: 'name email designation' } });

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST process/complete payroll run
router.post('/runs/:id/complete', async (req, res) => {
  try {
    const run = await PayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ message: 'Payroll run not found' });

    run.status = 'completed';
    run.completedAt = new Date();
    await run.save();

    await SalarySlip.updateMany({ payrollRun: run._id }, { status: 'completed' });

    res.json({ message: 'Payroll run completed', run });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE payroll run
router.delete('/runs/:id', async (req, res) => {
  try {
    const run = await PayrollRun.findById(req.params.id);
    if (!run) return res.status(404).json({ message: 'Payroll run not found' });

    await SalarySlip.deleteMany({ payrollRun: run._id });
    await PayrollRun.findByIdAndDelete(req.params.id);
    res.json({ message: 'Payroll run and slips deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ======= SALARY SLIPS =======

// POST create a salary slip for an employee
router.post('/slips', async (req, res) => {
  try {
    const {
      employee, employeeName, employeeEmail, employeeId, designation, department, workLocation,
      month, monthName, year,
      companyName, companyAddress, companyEmail, companyWebsite,
      earnings, facilities, totalValue,
      paymentDetails, authorizedBy, notes1, notes2,
      // legacy fields for compatibility
      basicSalary, hra, allowances, deductions, tax, netSalary, bonus,
      status
    } = req.body;
    if (!employee || !employeeName || !employeeEmail || !month || !year) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const slip = await SalarySlip.create({
      employee,
      employeeName,
      employeeEmail,
      employeeId,
      designation,
      department,
      workLocation,
      month,
      monthName,
      year,
      companyName,
      companyAddress,
      companyEmail,
      companyWebsite,
      earnings,
      facilities,
      totalValue,
      paymentDetails,
      authorizedBy,
      notes1,
      notes2,
      // legacy fields
      basicSalary,
      hra,
      allowances,
      deductions,
      tax,
      netSalary,
      bonus,
      status: status || 'completed',
    });
    res.status(201).json(slip);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET salary slips (for individual employee or all)
router.get('/slips', async (req, res) => {
  try {
    const { employee, month, year } = req.query;
    const query = {};
    if (employee) query.employee = employee;
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    const slips = await SalarySlip.find(query).populate('employee', 'name email designation').sort('-year -month');
    res.json(slips);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update a salary slip
router.put('/slips/:id', async (req, res) => {
  try {
    const slip = await SalarySlip.findById(req.params.id);
    if (!slip) return res.status(404).json({ message: 'Salary slip not found' });

    // Update all fields, including new arrays and extra fields
    const fields = [
      'employee', 'employeeName', 'employeeEmail', 'employeeId', 'designation', 'department', 'workLocation',
      'month', 'monthName', 'year',
      'companyName', 'companyAddress', 'companyEmail', 'companyWebsite',
      'earnings', 'facilities', 'totalValue',
      'paymentDetails', 'authorizedBy', 'notes1', 'notes2',
      'basicSalary', 'hra', 'allowances', 'deductions', 'tax', 'netSalary', 'bonus', 'status'
    ];
    fields.forEach(f => {
      if (req.body[f] !== undefined) slip[f] = req.body[f];
    });
    await slip.save();
    res.json(slip);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST email salary slips for a payroll run
router.post('/runs/:id/email-slips', async (req, res) => {
  try {
    const run = await PayrollRun.findById(req.params.id).populate({
      path: 'slips',
      populate: { path: 'employee', select: 'name email designation' }
    });
    if (!run) return res.status(404).json({ message: 'Payroll run not found' });

    // Get payroll SMTP config
    let smtpConfig = await SmtpConfig.findOne({ type: 'payroll', isActive: true });
    if (!smtpConfig) smtpConfig = await SmtpConfig.findOne({ type: 'system', isActive: true });

    const transportConfig = smtpConfig ? {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: { user: smtpConfig.user, pass: smtpConfig.pass }
    } : {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS
      }
    };

    const transporter = nodemailer.createTransport(transportConfig);
    const fromEmail = smtpConfig?.fromEmail || process.env.SMTP_USER || process.env.EMAIL_USER;
    const fromName = smtpConfig?.fromName || process.env.COMPANY_NAME || 'FinOps HR';
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];


    // PDFKit utility for salary slip
    const { generateSalarySlipPDF } = require('../utils/salarySlipPDF');
    const os = require('os');
    let sentCount = 0;
    for (const slip of run.slips) {
      if (!slip.employeeEmail) continue;

      // Prepare data for PDF: pass the full slip object, including all arrays and fields
      const slipObj = slip.toObject ? slip.toObject() : slip;
      slipObj.monthName = monthNames[slip.month - 1]; // ensure monthName is set
      const pdfPath = path.join(os.tmpdir(), `salary-slip-${slip.employeeName.replace(/\s+/g, '_')}-${slip.month}-${slip.year}.pdf`);
      await generateSalarySlipPDF(slipObj, pdfPath);

      const html = `<div style="font-family:Arial,sans-serif;">Dear <strong>${slip.employeeName}</strong>,<br>Your salary slip for ${monthNames[slip.month - 1]} ${slip.year} is attached as a PDF.<br><br>Regards,<br>${fromName}</div>`;

      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: slip.employeeEmail,
        subject: `Salary Slip - ${monthNames[slip.month - 1]} ${slip.year}`,
        html,
        attachments: [
          {
            filename: `Salary Slip - ${monthNames[slip.month - 1]} ${slip.year}.pdf`,
            path: pdfPath,
            contentType: 'application/pdf',
          },
        ],
      });

      slip.status = 'sent';
      slip.sentAt = new Date();
      await slip.save();
      sentCount++;
    }

    res.json({ message: `Salary slips emailed to ${sentCount} employees` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Failed to email slips: ${err.message}` });
  }
});

module.exports = router;
