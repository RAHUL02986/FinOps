const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');


const router = express.Router();
router.use(protect);

// GET /api/users (open to all roles)
router.get('/', authorize('superadmin', 'admin', 'hr', 'manager', 'dataentry'), async (req, res) => {
  try {
    const { search, isActive, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: users.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// All other user routes restricted to superadmin and admin
router.use(authorize('superadmin', 'admin'));

// POST /api/users
  router.post(
    '/',
    [
      body('name').notEmpty().trim().withMessage('Name is required'),
      body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
      body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
      body('role').optional().isIn(['dataentry', 'hr', 'manager', 'admin', 'user']).withMessage('Invalid role'),
      body('sector').optional().isIn(['IT', 'HR', 'Finance', 'Sales', 'Marketing', 'Operations', 'Admin']).withMessage('Invalid sector'),
      body('employmentType').optional().isIn(['full-time', 'part-time']).withMessage('Invalid employment type'),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      try {
        const { name, email, password, role = 'dataentry', designation = '', sector = 'IT', employmentType = 'full-time', joiningDate, experienceYears = 0 } = req.body;

        const exists = await User.findOne({ email });
        if (exists) {
          return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const user = await User.create({ 
          name, 
          email, 
          password, 
          role, 
          designation, 
          sector, 
          employmentType, 
          joiningDate, 
          experienceYears: Number(experienceYears) 
        });

        const userObj = await User.findById(user._id).select('-password');

        res.status(201).json({
          success: true,
          data: userObj,
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    }
  );

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, email, role, designation, sector, employmentType, joiningDate, experienceYears, isActive, password } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent admin from deactivating themselves
    if (req.params.id === req.user.id.toString() && isActive === false) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own account' });
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (designation !== undefined) user.designation = designation;
    if (sector !== undefined) user.sector = sector;
    if (employmentType !== undefined) user.employmentType = employmentType;
    if (joiningDate !== undefined) user.joiningDate = joiningDate || null;
    if (experienceYears !== undefined) user.experienceYears = Number(experienceYears);
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = password; // triggers pre-save hash

    await user.save();

    const updatedUser = user.toObject();
    delete updatedUser.password;

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await user.deleteOne();
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
