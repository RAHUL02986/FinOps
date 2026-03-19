const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

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
          experienceYears: user.experienceYears
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
          experienceYears: user.experienceYears
        },
      });

    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

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
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
