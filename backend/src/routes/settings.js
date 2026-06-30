const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const SmtpConfig = require('../models/SmtpConfig');
const nodemailer = require('nodemailer');

// All SMTP configuration routes require authentication and elevated privileges
router.use(protect);
router.use(authorize('superadmin', 'admin'));

// Shared network timeout controls to prevent 2-minute server freezes on Render container layers
const mailTimeoutOptions = {
  connectionTimeout: 10000, // 10 seconds max to establish TCP socket connection
  greetingTimeout: 10000,   // 10 seconds max to wait for SMTP greeting banner
  socketTimeout: 15000,     // 15 seconds max inactivity limit
  tls: {
    rejectUnauthorized: false // Prevents local certificate self-signed validation crashes
  }
};

// GET all SMTP configs
router.get('/', async (req, res) => {
  try {
    const configs = await SmtpConfig.find().populate('updatedBy', 'name email');
    
    // Return all 3 essential configuration types, mapping defaults for unconfigured items
    const types = ['system', 'invoice', 'payroll'];
    const result = types.map(type => {
      const existing = configs.find(c => c.type === type);
      if (existing) return existing.toObject();
      
      return { 
        type, 
        host: '', 
        port: 587, 
        secure: false, 
        user: '', 
        pass: '', 
        fromName: '', 
        fromEmail: '', 
        isActive: false 
      };
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

    // Normalize and typecast network types to prevent string mismatch anomalies
    const normalizedConfig = {
      host: host ? host.trim() : '',
      port: port ? parseInt(port, 10) : 587,
      secure: secure === true || String(secure) === 'true' || parseInt(port, 10) === 465,
      user: user ? user.trim() : '',
      pass,
      fromName: fromName ? fromName.trim() : '',
      fromEmail: fromEmail ? fromEmail.trim() : '',
      isActive: isActive === true || String(isActive) === 'true',
      updatedBy: req.user._id
    };

    const config = await SmtpConfig.findOneAndUpdate(
      { type },
      normalizedConfig,
      { upsert: true, new: true, runValidators: true }
    );

    res.json(config);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST test SMTP connection details
router.post('/test/:type', async (req, res) => {
  try {
    const { type } = req.params;
    let config = await SmtpConfig.findOne({ type });

    // Fall back to environment configuration declarations if target store variant doesn't exist
    if (!config) {
      const fallbackPort = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10);
      config = {
        host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
        port: fallbackPort,
        secure: fallbackPort === 465,
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS
      };
    }

    if (!config.host || !config.user) {
      return res.status(400).json({ message: `SMTP credentials are unconfigured for target variant type: "${type}"` });
    }

    const targetPort = parseInt(config.port, 10);

    // Build configuration injector wrapping robust connection thresholds
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: targetPort,
      secure: config.secure === true || targetPort === 465,
      auth: { 
        user: config.user, 
        pass: config.pass 
      },
      ...mailTimeoutOptions
    });

    // Validates credential handshakes. Fails early via timeouts instead of waiting indefinitely.
    await transporter.verify();
    res.json({ message: 'SMTP connection handshake established successfully!' });
  } catch (err) {
    // Return a 400 bad request with the explicit handshake validation failure context
    res.status(400).json({ message: `SMTP connection failed: ${err.message}` });
  }
});

module.exports = router;