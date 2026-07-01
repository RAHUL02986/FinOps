const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { SalarySlip, PayrollRun } = require('../models/Payroll');
const User = require('../models/User');
const SmtpConfig = require('../models/SmtpConfig');
const nodemailer = require('nodemailer');
const path = require('path');
const os = require('os');

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Global Middleware Protection (Moved to the top to secure ALL routes, including missing-slips)
router.use(protect);
router.use(authorize('superadmin', 'admin', 'hr', 'manager'));

// Shared network timeout controls to prevent 2-minute server freezes on Render free tier
const mailTimeoutOptions = {
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 15000,
  tls: {
    rejectUnauthorized: false // Bypasses strict local SSL errors on Linux/Render instances
  }
};

// GET employees missing a salary slip for a given month/year
router.get('/missing-slips', async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ message: 'month and year are required' });
    }
    // Get all active employees (except superadmin)
    const employees = await User.find({ isActive: true, role: { $ne: 'superadmin' } });
    // Get all slips for this month/year
    const slips = await SalarySlip.find({ month: parseInt(month, 10), year: parseInt(year, 10) });
    const slipEmployeeIds = new Set(slips.map(s => s.employee.toString()));
    
    // Employees without a slip for this period
    const missing = employees.filter(e => !slipEmployeeIds.has(e._id.toString()));
    res.json(missing.map(e => ({
      _id: e._id,
      name: e.name,
      email: e.email,
      employeeId: e.employeeId,
      designation: e.designation,
      department: e.department
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ======= PAYROLL RUNS =======

// GET all payroll runs
router.get('/runs', async (req, res) => {
  try {
    const runs = await PayrollRun.find()
      .populate('processedBy', 'name email')
      .populate({ path: 'slips', populate: { path: 'employee', select: 'name email designation' } })
      .sort('-year -month');

    // Recalculate totals in-memory to ensure UI always shows current slip data
    const runsWithTotals = runs.map(run => {
      const totalAmount = Array.isArray(run.slips)
        ? run.slips.reduce((sum, slip) => sum + (Number(slip.netSalary) || 0), 0)
        : 0;
      const employeeCount = Array.isArray(run.slips) ? run.slips.length : 0;
      if (run.totalAmount !== totalAmount) {
        run.totalAmount = totalAmount;
      }
      if (run.employeeCount !== employeeCount) {
        run.employeeCount = employeeCount;
      }
      return run;
    });

    res.json(runsWithTotals);
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
      employeeCount: 0
    });

    // Generate salary slips for each employee, but only if they have a previous slip
    const slips = [];
    for (const emp of employees) {
      // Check if a slip for this employee and this period already exists
      const existingSlip = await SalarySlip.findOne({ employee: emp._id, month, year });
      if (existingSlip) {
        slips.push(existingSlip._id);
        continue;
      }
      // Find latest slip for this employee (before this period)
      const latestSlip = await SalarySlip.findOne({ employee: emp._id }).sort({ year: -1, month: -1 });
      if (!latestSlip) {
        continue; // Skip employee if no previous salary slip exists
      }
      
      // Copy all fields from the latest slip except system IDs and timestamps
      const slipData = latestSlip.toObject();
      delete slipData._id;
      delete slipData.month;
      delete slipData.year;
      delete slipData.payrollRun;
      delete slipData.createdAt;
      delete slipData.updatedAt;
      
      slipData.month = month;
      slipData.year = year;
      slipData.monthName = MONTHS[month - 1] || '';
      slipData.effectiveFrom = new Date(year, month - 1, 1);
      slipData.payrollRun = run._id;
      slipData.employee = emp._id;
      slipData.employeeName = emp.name;
      slipData.employeeEmail = emp.email;
      slipData.designation = emp.designation || '';
      slipData.workLocation = process.env.WORK_LOCATION || '';
      slipData.status = 'draft';
      slipData.sentAt = null;

      // Recalculate deductions and netSalary cleanly
      const earnings = slipData.earnings || [];
      const extraDeductions = slipData.extraDeductions || [];
      const facilities = slipData.facilities || [];
      const earningsTotal = Array.isArray(earnings) ? earnings.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0) : 0;
      const extraDeductionsTotal = Array.isArray(extraDeductions) ? extraDeductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0) : 0;
      const facilitiesTotal = Array.isArray(facilities) ? facilities.reduce((sum, f) => sum + (parseFloat(f.cost) || 0), 0) : 0;
      
      const gross = Number(slipData.basicSalary) + Number(slipData.hra) + Number(slipData.allowances) + Number(slipData.bonus) + earningsTotal;
      const totalDeductions = facilitiesTotal + extraDeductionsTotal;
      slipData.deductions = totalDeductions;
      slipData.netSalary = gross - totalDeductions;
      
      const slip = await SalarySlip.create(slipData);
      slips.push(slip._id);
    }

    run.slips = slips;
    run.employeeCount = slips.length;
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
      earnings = [], extraDeductions = [], facilities = [], totalValue,
      paymentDetails, authorizedBy, notes1, notes2,
      basicSalary = 0, hra = 0, allowances = 0, bonus = 0, tax = 0,
      status
    } = req.body;

    if (!employee || !employeeName || !employeeEmail || !month || !year) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Calculate dynamic values safely
    const earningsTotal = Array.isArray(earnings) ? earnings.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0) : 0;
    const extraDeductionsTotal = Array.isArray(extraDeductions) ? extraDeductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0) : 0;
    const facilitiesTotal = Array.isArray(facilities) ? facilities.reduce((sum, f) => sum + (parseFloat(f.cost) || 0), 0) : 0;
    
    const gross = Number(basicSalary) + Number(hra) + Number(allowances) + Number(bonus) + earningsTotal;
    const totalDeductions = facilitiesTotal + extraDeductionsTotal;
    const netSalary = gross - totalDeductions;

    const userDoc = await User.findById(employee);
    
    const slip = await SalarySlip.create({
      employee,
      employeeName,
      employeeEmail,
      employeeId,
      designation,
      department,
      workLocation,
      fatherName: userDoc?.fatherName || '',
      motherName: userDoc?.motherName || '',
      month: parseInt(month, 10),
      monthName,
      year: parseInt(year, 10),
      companyName,
      companyAddress,
      companyEmail,
      companyWebsite,
      earnings,
      extraDeductions,
      facilities,
      totalValue,
      paymentDetails,
      authorizedBy,
      notes1,
      notes2,
      reason: req.body.reason || '',
      effectiveFrom: req.body.effectiveFrom || null,
      notes: req.body.notes || '',
      basicSalary: Number(basicSalary),
      hra: Number(hra),
      allowances: Number(allowances),
      deductions: totalDeductions,
      tax: Number(tax),
      netSalary,
      bonus: Number(bonus),
      status: status || 'draft',
    });

    if (req.body.reason === 'Promotion' && designation) {
      const user = await User.findById(employee);
      if (user && user.designation !== designation) {
        user.designation = designation;
        await user.save();
      }
    }

    await User.findByIdAndUpdate(employee, { facilities });
    res.status(201).json(slip);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET salary slips
router.get('/slips', async (req, res) => {
  try {
    const { employee, month, year, status } = req.query;
    const query = {};
    if (employee) query.employee = employee;
    if (month) query.month = parseInt(month, 10);
    if (year) query.year = parseInt(year, 10);
    if (status) query.status = status;
    
    const slips = await SalarySlip.find(query).populate('employee', 'name email designation').sort('-year -month');
    res.json(slips);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST email selected salary slips
router.post('/slips/email', async (req, res) => {
  try {
    const { slipIds } = req.body;
    if (!Array.isArray(slipIds) || slipIds.length === 0) {
      return res.status(400).json({ message: 'slipIds is required and must be a non-empty array' });
    }

    const slips = await SalarySlip.find({ _id: { $in: slipIds } }).populate('employee', 'name email designation');
    if (slips.length === 0) return res.status(404).json({ message: 'No salary slips found for the selected employees' });

    const filteredSlips = slips.filter(slip => slip.status !== 'sent');
    if (filteredSlips.length === 0) {
      return res.json({ message: 'No unsent salary slips found to email' });
    }

    let smtpConfig = await SmtpConfig.findOne({ type: 'payroll', isActive: true });
    if (!smtpConfig) smtpConfig = await SmtpConfig.findOne({ type: 'system', isActive: true });

    const transportConfig = smtpConfig ? {
      host: smtpConfig.host,
      port: Number(smtpConfig.port),
      secure: Number(smtpConfig.port) === 465,
      auth: { user: smtpConfig.user, pass: smtpConfig.pass },
      ...mailTimeoutOptions
    } : {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS
      },
      ...mailTimeoutOptions
    };

    const transporter = nodemailer.createTransport(transportConfig);
    const fromEmail = smtpConfig?.fromEmail || process.env.SMTP_USER || process.env.EMAIL_USER;
    const fromName = smtpConfig?.fromName || process.env.COMPANY_NAME || 'FinOps HR';
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const { generateSalarySlipPDF } = require('../utils/salarySlipPDF');

    let sentCount = 0;
    for (const slip of filteredSlips) {
      if (!slip.employeeEmail) continue;
      try {
        const slipObj = slip.toObject ? slip.toObject() : slip;
        slipObj.monthName = monthNames[slip.month - 1];

        const pdfPath = path.join(os.tmpdir(), `salary-slip-${slip.employeeName.replace(/\s+/g, '_')}-${slip.month}-${slip.year}.pdf`);
        await generateSalarySlipPDF(slipObj, pdfPath);

        const html = `<div style="font-family:Arial,sans-serif;">Dear <strong>${slip.employeeName}</strong>,<br>Your salary slip for ${monthNames[slip.month - 1]} ${slip.year} is attached as a PDF.<br><br>Regards,<br>${fromName}</div>`;

        await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to: slip.employeeEmail,
          subject: `Salary Slip - ${monthNames[slip.month - 1]} ${slip.year}`,
          html,
          attachments: [{ filename: `Salary Slip - ${monthNames[slip.month - 1]} ${slip.year}.pdf`, path: pdfPath, contentType: 'application/pdf' }]
        });

        slip.status = 'sent';
        slip.sentAt = new Date();
        await slip.save();
        sentCount++;
      } catch (sendErr) {
        console.error(`Failed to send salary slip for ${slip.employeeName}:`, sendErr.message);
        continue;
      }
    }

    res.json({ message: `Salary slips emailed to ${sentCount} employee(s)` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Failed to send selected salary slips: ${err.message}` });
  }
});

// PUT update a salary slip
router.put('/slips/:id', async (req, res) => {
  try {
    const slip = await SalarySlip.findById(req.params.id);
    if (!slip) return res.status(404).json({ message: 'Salary slip not found' });

    const fields = [
      'employee', 'employeeName', 'employeeEmail', 'employeeId', 'designation', 'department', 'workLocation',
      'month', 'monthName', 'year', 'companyName', 'companyAddress', 'companyEmail', 'companyWebsite',
      'earnings', 'extraDeductions', 'facilities', 'totalValue', 'paymentDetails', 'authorizedBy',
      'notes1', 'notes2', 'reason', 'effectiveFrom', 'notes', 'basicSalary', 'hra', 'allowances', 'tax', 'bonus', 'status'
    ];
    
    fields.forEach(f => {
      if (req.body[f] !== undefined) slip[f] = req.body[f];
    });

    const earnings = slip.earnings || [];
    const extraDeductions = slip.extraDeductions || [];
    const facilities = slip.facilities || [];
    const earningsTotal = Array.isArray(earnings) ? earnings.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0) : 0;
    const extraDeductionsTotal = Array.isArray(extraDeductions) ? extraDeductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0) : 0;
    const facilitiesTotal = Array.isArray(facilities) ? facilities.reduce((sum, f) => sum + (parseFloat(f.cost) || 0), 0) : 0;

    if (slip.month !== undefined && slip.year !== undefined) {
      slip.monthName = MONTHS[slip.month - 1] || slip.monthName;
    }
    
    const gross = Number(slip.basicSalary) + Number(slip.hra) + Number(slip.allowances) + Number(slip.bonus) + earningsTotal;
    const totalDeductions = facilitiesTotal + extraDeductionsTotal;
    slip.deductions = totalDeductions;
    slip.netSalary = gross - totalDeductions;

    if (req.body.reason === 'Promotion' && slip.designation) {
      const user = await User.findById(slip.employee);
      if (user && user.designation !== slip.designation) {
        user.designation = slip.designation;
        await user.save();
      }
    }
    
    await slip.save();

    // Recalculate payroll run total when a slip is updated
    if (slip.payrollRun) {
      const run = await PayrollRun.findById(slip.payrollRun);
      if (run) {
        const relatedSlips = await SalarySlip.find({ payrollRun: run._id });
        run.totalAmount = relatedSlips.reduce((sum, s) => sum + (Number(s.netSalary) || 0), 0);
        await run.save();
      }
    }

    res.json(slip);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST complete selected salary slips
router.post('/slips/complete', async (req, res) => {
  try {
    const { slipIds } = req.body;
    if (!Array.isArray(slipIds) || slipIds.length === 0) {
      return res.status(400).json({ message: 'slipIds is required and must be a non-empty array' });
    }

    const result = await SalarySlip.updateMany(
      { _id: { $in: slipIds } },
      { status: 'completed' }
    );

    res.json({ message: `${result.modifiedCount} salary slip(s) marked as completed` });
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

    const slipIds = Array.isArray(req.body.slipIds) ? req.body.slipIds : null;
    let selectedSlips = run.slips;
    if (slipIds && slipIds.length) {
      const uniqueIds = [...new Set(slipIds.map(id => id.toString()))];
      selectedSlips = run.slips.filter(slip => uniqueIds.includes(slip._id.toString()));
    }

    // Only send slips that have not already been sent
    selectedSlips = selectedSlips.filter(slip => slip.status !== 'sent');
    if (selectedSlips.length === 0) {
      return res.json({ message: 'No unsent salary slips found to email' });
    }

    // Find active custom SMTP config matching 'payroll' type or fall back to system
    let smtpConfig = await SmtpConfig.findOne({ type: 'payroll', isActive: true });
    if (!smtpConfig) smtpConfig = await SmtpConfig.findOne({ type: 'system', isActive: true });

    const transportConfig = smtpConfig ? {
      host: smtpConfig.host,
      port: Number(smtpConfig.port),
      secure: Number(smtpConfig.port) === 465,
      auth: { user: smtpConfig.user, pass: smtpConfig.pass },
      ...mailTimeoutOptions
    } : {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: parseInt(process.env.SMTP_PORT, 10) === 465,
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS
      },
      ...mailTimeoutOptions
    };

    const transporter = nodemailer.createTransport(transportConfig);
    const fromEmail = smtpConfig?.fromEmail || process.env.SMTP_USER || process.env.EMAIL_USER;
    const fromName = smtpConfig?.fromName || process.env.COMPANY_NAME || 'FinOps HR';
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    const { generateSalarySlipPDF } = require('../utils/salarySlipPDF');
    let sentCount = 0;

    // Loop handles operations sequentially but catches individual internal delivery crashes gracefully
    for (const slip of selectedSlips) {
      if (!slip.employeeEmail) continue;

      try {
        const slipObj = slip.toObject ? slip.toObject() : slip;
        slipObj.monthName = monthNames[slip.month - 1]; 

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
      } catch (individualEmailError) {
        console.error(`Failed to dispatch email for user ${slip.employeeName}:`, individualEmailError.message);
        continue;
      }
    }

    res.json({ message: `Salary slips emailed to ${sentCount} employees` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Failed to execute payroll email run: ${err.message}` });
  }
});

module.exports = router;