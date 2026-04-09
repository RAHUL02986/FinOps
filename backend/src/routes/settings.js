const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const SmtpConfig = require('../models/SmtpConfig');
const nodemailer = require('nodemailer');

// All routes require superadmin
router.use(protect);
router.use(authorize('superadmin', 'admin'));

// GET all SMTP configs
router.get('/', async (req, res) => {
  try {
    const configs = await SmtpConfig.find().populate('updatedBy', 'name email');
    // Return all 3 types, even if empty
    const types = ['system', 'invoice', 'payroll'];
    const result = types.map(type => {
      const existing = configs.find(c => c.type === type);
      if (existing) return existing.toObject();
      return { type, host: '', port: 587, secure: false, user: '', pass: '', fromName: '', fromEmail: '', isActive: false };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT (upsert) a specific SMTP config by type
router.put('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    if (!['system', 'invoice', 'payroll'].includes(type)) {
      return res.status(400).json({ message: 'Invalid SMTP type. Must be system, invoice, or payroll.' });
    }

    const { host, port, secure, user, pass, fromName, fromEmail, isActive } = req.body;

    const config = await SmtpConfig.findOneAndUpdate(
      { type },
      { host, port, secure, user, pass, fromName, fromEmail, isActive, updatedBy: req.user._id },
      { upsert: true, new: true, runValidators: true }
    );

    res.json(config);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST test SMTP connection
router.post('/test/:type', async (req, res) => {
  try {
    const { type } = req.params;
    let config = await SmtpConfig.findOne({ type });

    // If no config in DB, try env variables
    if (!config) {
      config = {
        host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS
      };
    }

    if (!config.host || !config.user) {
      return res.status(400).json({ message: 'SMTP not configured for this type.' });
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure || false,
      auth: { user: config.user, pass: config.pass }
    });

    await transporter.verify();
    res.json({ message: 'SMTP connection successful!' });
  } catch (err) {
    res.status(400).json({ message: `SMTP connection failed: ${err.message}` });
  }
});

module.exports = router;
