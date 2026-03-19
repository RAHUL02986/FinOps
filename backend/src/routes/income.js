const express = require('express');
const { body, validationResult } = require('express-validator');
const Income = require('../models/Income');
const { protect } = require('../middleware/auth');

const ELEVATED = ['superadmin', 'hr', 'manager'];
const isElevated = (role) => ELEVATED.includes(role);

const router = express.Router();
router.use(protect);

// GET /api/income
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, source, page = 1, limit = 10, userId } = req.query;

    const filter = {};
    if (isElevated(req.user.role)) {
      if (userId) filter.user = userId;
    } else {
      filter.user = req.user.id;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }
    if (source) filter.source = source;

    const total = await Income.countDocuments(filter);
    const incomes = await Income.find(filter)
      .populate('user', 'name email')
      .sort({ date: -1 })
      .skip((page - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: incomes.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: incomes,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/income
router.post(
  '/',
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    body('source').notEmpty().withMessage('Source is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    if (!isElevated(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to add income' });
    }

    try {
      const { userId: targetUserId, ...rest } = req.body;
      const owner = targetUserId ? targetUserId : req.user.id;
      // HR-created income is not approved (add status if schema supports, else skip)
      // If Income schema is extended, add status logic here
      const income = await Income.create({ ...rest, user: owner });
      res.status(201).json({ success: true, data: income });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// PUT /api/income/:id
router.put('/:id', async (req, res) => {
  try {
    const income = await Income.findById(req.params.id);
    if (!income) {
      return res.status(404).json({ success: false, message: 'Income not found' });
    }

    if (!isElevated(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Only admin can approve (if status logic is added)
    const { user: _user, ...updateData } = req.body;

    const updated = await Income.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/income/:id
router.delete('/:id', async (req, res) => {
  try {
    const income = await Income.findById(req.params.id);
    if (!income) {
      return res.status(404).json({ success: false, message: 'Income not found' });
    }

    if (!isElevated(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await income.deleteOne();
    res.json({ success: true, message: 'Income deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
