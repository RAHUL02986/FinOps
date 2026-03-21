const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const RecurringExpense = require('../models/RecurringExpense');

router.use(protect);
// Only HR can create, only admin can edit/delete/mark-paid
router.use((req, res, next) => {
  // Allow HR and Admin to create
  if (req.method === 'POST' && req.path === '/') {
    if (req.user.role !== 'hr' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only HR or Admin can create recurring expenses' });
    }
    return next();
  }
  // Only admin can edit/delete/mark-paid
  if ((req.method === 'PUT' || req.method === 'DELETE' || (req.method === 'POST' && req.path.endsWith('/mark-paid')))) {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only admin can perform this action' });
    }
    return next();
  }
  // GET allowed for all authorized
  next();
});

// GET all recurring expenses
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;
    const expenses = await RecurringExpense.find(query).populate('createdBy', 'name email').sort('-createdAt');
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create recurring expense
router.post('/', async (req, res) => {
  try {
    const expense = await RecurringExpense.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update recurring expense
router.put('/:id', async (req, res) => {
  try {
    const expense = await RecurringExpense.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!expense) return res.status(404).json({ message: 'Recurring expense not found' });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE recurring expense
router.delete('/:id', async (req, res) => {
  try {
    const expense = await RecurringExpense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Recurring expense not found' });
    res.json({ message: 'Recurring expense deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST mark as paid - advances nextDueDate
router.post('/:id/mark-paid', async (req, res) => {
  try {
    const expense = await RecurringExpense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Recurring expense not found' });

    expense.lastPaidDate = new Date();

    // Advance next due date based on frequency
    const next = new Date(expense.nextDueDate);
    switch (expense.frequency) {
      case 'weekly': next.setDate(next.getDate() + 7); break;
      case 'monthly': next.setMonth(next.getMonth() + 1); break;
      case 'quarterly': next.setMonth(next.getMonth() + 3); break;
      case 'yearly': next.setFullYear(next.getFullYear() + 1); break;
      case 'custom': next.setDate(next.getDate() + (expense.customDays || 30)); break;
    }
    expense.nextDueDate = next;
    await expense.save();
    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
