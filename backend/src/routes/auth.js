const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const { protect } = require('../middleware/auth');
const nodemailer = require('nodemailer');
const SmtpConfig = require('../models/SmtpConfig');
const crypto = require('crypto');
const OTP_EXPIRY_MINUTES = 10;

// In-memory OTP store (for demo; use Redis or DB in production)
const otpStore = {};

console.log('[DEBUG] Loading auth.js and registering /api/auth routes...');
const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

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

      const exists = await User.findOne({ email });
      if (exists) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }

      const user = await User.create({ name, email, password });
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
      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+password');
      console.log('LOGIN ATTEMPT:', { email, found: !!user, role: user?.role });
      if (!user) {
        console.log('LOGIN RESULT: user not found');
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
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
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
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
        otpStore[user.email] = { otp, expiresAt };

        // Find admin email (first active admin)
        const adminUser = await User.findOne({ role: 'admin', isActive: true });
        const adminEmail = adminUser ? adminUser.email : process.env.ADMIN_EMAIL;
        if (!adminEmail) {
          return res.status(500).json({ success: false, message: 'Admin email not configured' });
        }

        // Send OTP to admin email
        let smtpConfig = await SmtpConfig.findOne({ type: 'system', isActive: true });
        let transporter;
        if (smtpConfig) {
          transporter = nodemailer.createTransport({
            host: smtpConfig.host,            
            port: Number(smtpConfig.port), 
            secure: smtpConfig.port === 465, 
            auth: { user: smtpConfig.user, pass: smtpConfig.pass },
            tls: { rejectUnauthorized: false } // Helps on Render
          });
        } else {
          transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: false,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
            tls: {
              rejectUnauthorized: false // Crucial for Gmail + Cloud hosting
            }
          });
        }try {
            await transporter.verify();
            console.log("SMTP connection verified successfully");
          } catch (err) {
            console.error("SMTP Verification Failed:", err);
          }
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: adminEmail,
          subject: `OTP for ${user.role} login: ${user.email}`,
          text: `OTP for ${user.name} (${user.email}) login: ${otp}\nThis OTP is valid for ${OTP_EXPIRY_MINUTES} minutes.`,
        });

        return res.json({
          success: true,
          otpRequired: true,
          message: 'OTP sent to admin email. Please enter the OTP to continue.',
          user: { email: user.email },
        });
      }

      // Normal login for other roles
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
  const { email, otp } = req.body;
  console.log(`[DEBUG] Verifying OTP for email: ${email}, otp: ${otp}`);
  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required' });
  }
  const record = otpStore[email];
  if (!record || record.otp !== otp) {
    return res.status(401).json({ success: false, message: 'Invalid OTP' });
  }
  if (Date.now() > record.expiresAt) {
    delete otpStore[email];
    return res.status(401).json({ success: false, message: 'OTP expired' });
  }
  // OTP valid, delete it
  delete otpStore[email];
  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  // Mark as verified for future logins
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
      profileImage: user.profileImage
    },
  });
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
