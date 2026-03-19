const express = require('express');
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
// Removed Income and Expense models; only Transaction is used
const { protect } = require('../middleware/auth');

const ELEVATED = ['superadmin', 'hr', 'manager'];
const isElevated = (role) => ELEVATED.includes(role);

const router = express.Router();
router.use(protect);

// GET /api/transactions
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, type, category, source, page = 1, limit = 10, userId, status } = req.query;
    const filter = {};
    if (isElevated(req.user.role)) {
      if (userId) filter.user = userId;
    } else {
      filter.user = req.user.id;
    }
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (source) filter.source = source;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }
    const total = await Transaction.countDocuments(filter);
    const txns = await Transaction.find(filter)
      .populate('user', 'name email')
      .populate('account', 'name bankName')
      .populate('team', 'name')
      .populate('employee', 'name email')
      .sort({ date: -1 })
      .skip((page - 1) * parseInt(limit))
      .limit(parseInt(limit));
    res.json({
      success: true,
      count: txns.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: txns,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/transactions
router.post(
  '/',
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    body('type').isIn(['income', 'expense', 'transfer']).withMessage('Type is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      // Set status to 'Pending' if HR, 'Draft' if Data Entry, else default
      let status = req.body.status;
      if (req.user.role === 'hr') status = 'Pending';
      if (req.user.role === 'dataentry') status = 'Draft';
      const txn = await Transaction.create({
        ...req.body,
        user: req.user.id,
        status: status || undefined,
      });

      // No need to create Income/Expense; dashboard uses only Transaction
      res.status(201).json({ success: true, data: txn });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// PUT /api/transactions/:id
router.put('/:id', async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id);
    if (!txn) return res.status(404).json({ success: false, message: 'Transaction not found' });
    // Only admin can approve or reject
    if (
      'status' in req.body &&
      (req.body.status === 'Approved' || req.body.status === 'Rejected') &&
      req.user.role !== 'superadmin'
    ) {
      return res.status(403).json({ success: false, message: 'Only admin can approve or reject transactions' });
    }
    const updated = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
  try {
    const txn = await Transaction.findByIdAndDelete(req.params.id);
    if (!txn) return res.status(404).json({ success: false, message: 'Transaction not found' });

    // No need to delete Income/Expense; dashboard uses only Transaction

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
