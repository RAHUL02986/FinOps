const express = require('express');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const getPeriodStart = (period) => {
  const now = new Date();
  switch (period) {
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'quarter':
      return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    default:
      return null;
  }
};

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    const startDate = getPeriodStart(period);
    const dateMatch = startDate ? { date: { $gte: startDate } } : {};
    let matchBase = { status: 'Approved', ...dateMatch };
    // superadmin and hr see all, others see only their own
    if (req.user.role !== 'superadmin' && req.user.role !== 'hr') {
      matchBase.user = new mongoose.Types.ObjectId(req.user.id);
    }
    const [incomeAgg, expenseAgg, recentTxns] = await Promise.all([
      Transaction.aggregate([
        { $match: { ...matchBase, type: 'income' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        { $match: { ...matchBase, type: 'expense' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Transaction.find(matchBase).sort({ date: -1 }).limit(10),
    ]);

    const totalIncome = incomeAgg[0]?.total || 0;
    const totalExpenses = expenseAgg[0]?.total || 0;
    const transactionCount = (incomeAgg[0]?.count || 0) + (expenseAgg[0]?.count || 0);

    const recentTransactions = recentTxns.map((t) => ({ ...t.toObject(), type: t.type }));

    res.json({
      success: true,
      data: {
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
        transactionCount,
        recentTransactions,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/dashboard/chart
router.get('/chart', async (req, res) => {
  try {

const isHr = req.user.role === 'hr';
    const userId = mongoose.isValidObjectId(req.user.id) ? new mongoose.Types.ObjectId(req.user.id) : null;
    // superadmin and hr see all, others see only their own
    const userMatch = (req.user.role === 'superadmin' || req.user.role === 'hr') ? {} : { user: userId };
    // Last 6 months data from Transaction collection
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const [incomeAgg, expenseAgg] = await Promise.all([
        Transaction.aggregate([
          { $match: { ...userMatch, status: 'Approved', type: 'income', date: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Transaction.aggregate([
          { $match: { ...userMatch, status: 'Approved', type: 'expense', date: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

      monthlyData.push({
        month: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        income: incomeAgg[0]?.total || 0,
        expenses: expenseAgg[0]?.total || 0,
      });
    }

    // Expense category breakdown (all time) from Transaction collection
    const categoryBreakdown = await Transaction.aggregate([
      { $match: { ...userMatch, status: 'Approved', type: 'expense' } },
      { $group: { _id: '$category', value: { $sum: '$amount' } } },
      { $sort: { value: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        monthly: monthlyData,
        categories: categoryBreakdown.map((c) => ({ name: c._id, value: c.value })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
