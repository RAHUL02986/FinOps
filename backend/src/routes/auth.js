const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const { protect } = require('../middleware/auth');
const nodemailer = require('nodemailer');
const SmtpConfig = require('../models/SmtpConfig');
const crypto = require('crypto');
const OTP_EXPIRY_MINUTES = 10;

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function normalizeUserEmail(email) {
  if (!email || typeof email !== 'string') return email;
  let normalized = email.trim().toLowerCase();
  const [local, domain] = normalized.split('@');
  if (!domain) return normalized;
  const fixedDomain = domain === 'googlemail.com' ? 'gmail.com' : domain;
  if (fixedDomain === 'gmail.com') {
    const localBeforePlus = local.split('+')[0];
    const dotless = localBeforePlus.replace(/\./g, '');
    normalized = `${dotless}@${fixedDomain}`;
  } else {
    normalized = `${local}@${fixedDomain}`;
  }
  return normalized;
}

function gmailLocalRegex(email) {
  const [local, domain] = email.split('@');
  if (!domain || domain !== 'gmail.com') return null;
  const escapedChars = local.split('').map(ch => escapeRegExp(ch));
  const regexString = `^${escapedChars.join('\\.?')}@gmail\\.com$`;
  return new RegExp(regexString, 'i');
}

// In-memory OTP store (Note: For absolute reliability on Render free tier, migrate this to MongoDB fields later!)
const otpStore = {};

console.log('[DEBUG] Loading auth.js and registering /api/auth routes...');
const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

const mailTimeoutOptions = {
  connectionTimeout: 10000, 
  greetingTimeout: 10000,
  socketTimeout: 15000,
};

function getSmtpEnv() {
  return {
    user: process.env.SMTP_USER || process.env.EMAIL_USER || '',
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS || '',
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || '',
    host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587'),
  };
}

function createTransporterFromConfig(smtpConfig) {
  return nodemailer.createTransport({
    host: smtpConfig.host,
    port: Number(smtpConfig.port),
    secure: Number(smtpConfig.port) === 465,
    auth: { user: smtpConfig.user, pass: smtpConfig.pass },
    tls: { rejectUnauthorized: false },
    ...mailTimeoutOptions,
  });
}

function createTransporterFromEnv(envConfig) {
  return nodemailer.createTransport({
    host: envConfig.host,
    port: envConfig.port,
    secure: envConfig.port === 465,
    auth: { user: envConfig.user, pass: envConfig.pass },
    tls: { rejectUnauthorized: false },
    ...mailTimeoutOptions,
  });
}

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { name, email, password } = req.body;
      const normalizedEmail = normalizeUserEmail(email);

      const exists = await User.findOne({ email: normalizedEmail });
      if (exists) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }

      const user = await User.create({ name, email: normalizedEmail, password });
      const token = generateToken(user._id);

      res.status(201).json({
        success: true,
        token,
        user: { 
          id: user._id, 
          name: user.name, 
          email: user.email, 
          role: user.role, 
          designation: user.designation,
          sector: user.sector,
          employmentType: user.employmentType,
          joiningDate: user.joiningDate,
          experienceYears: user.experienceYears,
          profileImage: user.profileImage
        },
      });

    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      let { email, password } = req.body;
      const originalEmail = email;
      email = normalizeUserEmail(email);
      let user = await User.findOne({ email }).select('+password');
      if (!user && email.endsWith('@gmail.com')) {
        const regex = gmailLocalRegex(email);
        if (regex) {
          user = await User.findOne({ email: { $regex: regex } }).select('+password');
        }
      }
      console.log('LOGIN ATTEMPT:', { originalEmail, normalizedEmail: email, found: !!user, role: user?.role });
      if (!user) {
        console.log('LOGIN RESULT: user not found');
        return res.status(401).json({ success: false, message: 'Unauthorized credentials' });
      }

      if (!user.isActive) {
        console.log('LOGIN RESULT: user not active');
        return res
          .status(401)
          .json({ success: false, message: 'Account deactivated. Contact admin.' });
      }

      const isMatch = await user.matchPassword(password);
      console.log('LOGIN RESULT: password match?', isMatch);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Unauthorized credentials' });
      }

      // Block employee role from logging in
      if (user.role === 'employee') {
        return res.status(403).json({ success: false, message: 'You are not able to login to this tool.' });
      }

      // Roles requiring OTP
      const otpRoles = ['admin', 'hr', 'manager', 'dataentry'];
      if (otpRoles.includes(user.role) && !user.isVerified) {
        // Generate OTP
        const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
        const expiresAt = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;
        const otpEmail = normalizeUserEmail(user.email);
        otpStore[otpEmail] = { otp, expiresAt };

        // Find admin email (first active admin)
        const adminUser = await User.findOne({ role: 'admin', isActive: true });
        const adminEmail = adminUser ? adminUser.email : process.env.ADMIN_EMAIL;
        if (!adminEmail) {
          return res.status(500).json({ success: false, message: 'Admin email not configured' });
        }

        // Configure Mailer Transporter safely
        let smtpConfig = await SmtpConfig.findOne({ type: 'system', isActive: true });
        let transporter;
        let senderEmail;

        if (smtpConfig) {
          senderEmail = smtpConfig.fromEmail || smtpConfig.user;
          transporter = createTransporterFromConfig(smtpConfig);
        } else {
          const envConfig = getSmtpEnv();
          senderEmail = envConfig.from || envConfig.user;
          if (!envConfig.user || !envConfig.pass) {
            console.error('SMTP env missing user/pass for OTP email');
            return res.status(500).json({
              success: false,
              message: 'Failed to send verification OTP mail. SMTP credentials are not configured.',
            });
          }
          transporter = createTransporterFromEnv(envConfig);
        }

        try {
          // Send OTP Email
          await transporter.sendMail({
            from: senderEmail,
            to: adminEmail,
            subject: `OTP for ${user.role} login: ${user.email}`,
            text: `OTP for ${user.name} (${user.email}) login: ${otp}\nThis OTP is valid for ${OTP_EXPIRY_MINUTES} minutes.`,
          });
        } catch (mailError) {
          console.error("Nodemailer failed to dispatch OTP email:", mailError.message);
          return res.status(500).json({ 
            success: false, 
            message: "Failed to send verification OTP mail. Please check your system email configuration." 
          });
        }

        return res.json({
          success: true,
          otpRequired: true,
          message: 'OTP sent to admin email. Please enter the OTP to continue.',
          user: { email: otpEmail },
        });
      }

      // Normal login for roles that don't require OTP or are pre-verified
      const token = generateToken(user._id);
      res.json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          designation: user.designation,
          sector: user.sector,
          employmentType: user.employmentType,
          joiningDate: user.joiningDate,
          experienceYears: user.experienceYears,
          profileImage: user.profileImage
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// POST /auth/verify-otp
router.post('/verify-otp', (req, res, next) => {
  console.log('[DEBUG] /auth/verify-otp route handler called');
  next();
}, async (req, res) => {
  try {
    let { email, otp } = req.body;
    console.log(`[DEBUG] Verifying OTP for email: ${email}, otp: ${otp}`);
    
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }
    email = normalizeUserEmail(email);
    
    const record = otpStore[email];
    if (!record || record.otp !== otp) {
      return res.status(401).json({ success: false, message: 'Invalid OTP' });
    }
    
    if (Date.now() > record.expiresAt) {
      delete otpStore[email];
      return res.status(401).json({ success: false, message: 'OTP expired' });
    }
    
    // OTP valid, clear it from memory store
    delete otpStore[email];
    
    // Find user
    let user = await User.findOne({ email });
    if (!user && email.endsWith('@gmail.com')) {
      const regex = gmailLocalRegex(email);
      if (regex) {
        user = await User.findOne({ email: { $regex: regex } });
      }
    }
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Mark as verified for future sessions
    user.isVerified = true;
    await user.save();

    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        designation: user.designation,
        sector: user.sector,
        employmentType: user.employmentType,
        joiningDate: user.joiningDate,
        experienceYears: user.experienceYears,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;