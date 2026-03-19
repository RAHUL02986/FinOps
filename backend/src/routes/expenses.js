const express = require('express');
const { body, validationResult } = require('express-validator');
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');

const ELEVATED = ['superadmin', 'hr', 'manager'];
const isElevated = (role) => ELEVATED.includes(role);

const router = express.Router();
router.use(protect);

// GET /api/expenses
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, category, page = 1, limit = 10, userId } = req.query;

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
    if (category) filter.category = category;

    const total = await Expense.countDocuments(filter);
    const expenses = await Expense.find(filter)
      .populate('user', 'name email')
      .sort({ date: -1 })
      .skip((page - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: expenses.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: expenses,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/expenses
router.post(
  '/',
  [
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number'),
    body('category').notEmpty().withMessage('Category is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    if (!isElevated(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to add expenses' });
    }

    try {
      const { userId: targetUserId, ...rest } = req.body;
      const owner = targetUserId ? targetUserId : req.user.id;
      // HR-created expenses are not approved
      const approved = req.user.role === 'hr' ? false : true;
      const expense = await Expense.create({ ...rest, user: owner, approved });
      res.status(201).json({ success: true, data: expense });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// PUT /api/expenses/:id
router.put('/:id', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    if (!isElevated(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Only admin can approve
    if ('approved' in req.body && req.body.approved === true && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Only admin can approve expenses' });
    }

    // Prevent user field from being overwritten
    const { user: _user, ...updateData } = req.body;

    const updated = await Expense.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    if (!isElevated(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // HR cannot delete approved expenses
    if (req.user.role === 'hr' && expense.approved) {
      return res.status(403).json({ success: false, message: 'HR cannot delete approved expenses' });
    }

    await expense.deleteOne();
    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
