const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { SalarySlip, PayrollRun } = require('../models/Payroll');
const User = require('../models/User');
const SmtpConfig = require('../models/SmtpConfig');
const nodemailer = require('nodemailer');

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


    // Generate salary slips for each employee, using their latest slip if available
    const slips = [];
    for (const emp of employees) {
      // Find latest slip for this employee
      const latestSlip = await SalarySlip.findOne({ employee: emp._id })
        .sort({ year: -1, month: -1 });

      let basicSalary, hra, allowances, deductions, tax, bonus;
      if (latestSlip) {
        basicSalary = latestSlip.basicSalary || req.body.defaultBasicSalary || 50000;
        hra = latestSlip.hra || 0;
        allowances = latestSlip.allowances || 0;
        deductions = latestSlip.deductions || 0;
        tax = latestSlip.tax || 0;
        bonus = latestSlip.bonus || 0;
      } else {
        basicSalary = req.body.defaultBasicSalary || 50000;
        hra = Math.round(basicSalary * 0.4);
        allowances = Math.round(basicSalary * 0.1);
        deductions = Math.round(basicSalary * 0.1);
        tax = Math.round(basicSalary * 0.05);
        bonus = 0;
      }
      const netSalary = basicSalary + hra + allowances + bonus - deductions - tax;

      const slip = await SalarySlip.create({
        employee: emp._id,
        employeeName: emp.name,
        employeeEmail: emp.email,
        designation: emp.designation || '',
        basicSalary,
        hra,
        allowances,
        deductions,
        tax,
        bonus,
        netSalary,
        month,
        year,
        payrollRun: run._id
      });
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
    const { employee, employeeName, employeeEmail, designation, basicSalary, hra, allowances, deductions, tax, netSalary, bonus, month, year, reason, effectiveFrom, notes } = req.body;
    if (!employee || !employeeName || !employeeEmail || !basicSalary || !month || !year) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const slip = await SalarySlip.create({
      employee,
      employeeName,
      employeeEmail,
      designation,
      basicSalary,
      hra,
      allowances,
      deductions,
      tax,
      netSalary,
      bonus,
      month,
      year,
      reason,
      effectiveFrom,
      notes,
      status: 'completed',
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

    Object.assign(slip, req.body);
    slip.netSalary = (slip.basicSalary || 0) + (slip.hra || 0) + (slip.allowances || 0) + (slip.bonus || 0) - (slip.deductions || 0) - (slip.tax || 0);
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

    let sentCount = 0;
    for (const slip of run.slips) {
      if (!slip.employeeEmail) continue;

      const html = `
        <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
          <div style="background:#6366f1;color:#fff;padding:25px;border-radius:8px 8px 0 0;">
            <h2 style="margin:0;">Salary Slip - ${monthNames[slip.month - 1]} ${slip.year}</h2>
            <p style="margin:5px 0 0;opacity:0.9;">${process.env.COMPANY_NAME || 'Company'}</p>
          </div>
          <div style="padding:25px;border:1px solid #e5e7eb;border-top:none;">
            <p>Dear <strong>${slip.employeeName}</strong>,</p>
            <p>Here is your salary slip for ${monthNames[slip.month - 1]} ${slip.year}:</p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;">
              <tr style="background:#f9fafb;"><td style="padding:10px;border:1px solid #e5e7eb;font-weight:bold;">Basic Salary</td><td style="padding:10px;border:1px solid #e5e7eb;text-align:right;">₹${slip.basicSalary.toLocaleString()}</td></tr>
              <tr><td style="padding:10px;border:1px solid #e5e7eb;">HRA</td><td style="padding:10px;border:1px solid #e5e7eb;text-align:right;">₹${slip.hra.toLocaleString()}</td></tr>
              <tr style="background:#f9fafb;"><td style="padding:10px;border:1px solid #e5e7eb;">Allowances</td><td style="padding:10px;border:1px solid #e5e7eb;text-align:right;">₹${slip.allowances.toLocaleString()}</td></tr>
              ${slip.bonus ? `<tr><td style="padding:10px;border:1px solid #e5e7eb;">Bonus</td><td style="padding:10px;border:1px solid #e5e7eb;text-align:right;">₹${slip.bonus.toLocaleString()}</td></tr>` : ''}
              <tr style="background:#fef2f2;"><td style="padding:10px;border:1px solid #e5e7eb;">Deductions</td><td style="padding:10px;border:1px solid #e5e7eb;text-align:right;color:#ef4444;">-₹${slip.deductions.toLocaleString()}</td></tr>
              <tr style="background:#fef2f2;"><td style="padding:10px;border:1px solid #e5e7eb;">Tax</td><td style="padding:10px;border:1px solid #e5e7eb;text-align:right;color:#ef4444;">-₹${slip.tax.toLocaleString()}</td></tr>
              <tr style="background:#6366f1;color:#fff;"><td style="padding:12px;border:1px solid #6366f1;font-weight:bold;font-size:16px;">Net Salary</td><td style="padding:12px;border:1px solid #6366f1;text-align:right;font-weight:bold;font-size:16px;">₹${slip.netSalary.toLocaleString()}</td></tr>
            </table>
            <p style="color:#666;font-size:13px;">This is a system-generated salary slip. Please contact HR for any queries.</p>
          </div>
        </div>`;

      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: slip.employeeEmail,
        subject: `Salary Slip - ${monthNames[slip.month - 1]} ${slip.year}`,
        html
      });

      slip.status = 'sent';
      slip.sentAt = new Date();
      await slip.save();
      sentCount++;
    }

    res.json({ message: `Salary slips emailed to ${sentCount} employees` });
  } catch (err) {
    res.status(500).json({ message: `Failed to email slips: ${err.message}` });
  }
});

module.exports = router;
