

const express = require('express');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// ...existing code...

// GET /api/dashboard/chart
router.get('/chart', async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    let userFilter = { status: 'Approved' };
    if (req.user.role !== 'hr') {
      userFilter.user = new mongoose.Types.ObjectId(req.user.id);
    }

    // Last 6 periods (months/quarters/years)
    const periods = [];
    const now = new Date();
    let getLabel, getStartEnd;

    if (period === 'month') {
      getLabel = (d) => d.toLocaleString('default', { month: 'short', year: '2-digit' });
      getStartEnd = (i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end, label: getLabel(d) };
      };
    } else if (period === 'quarter') {
      getLabel = (d) => `Q${Math.floor(d.getMonth() / 3) + 1} '${String(d.getFullYear()).slice(-2)}`;
      getStartEnd = (i) => {
        const q = Math.floor((now.getMonth() - i * 3) / 3);
        const year = now.getFullYear() - Math.floor((now.getMonth() - i * 3) / 12);
        const month = ((now.getMonth() - i * 3) % 12 + 12) % 12;
        const d = new Date(year, month, 1);
        const start = new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
        const end = new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3 + 3, 0, 23, 59, 59, 999);
        return { start, end, label: getLabel(d) };
      };
    } else if (period === 'year') {
      getLabel = (d) => d.getFullYear();
      getStartEnd = (i) => {
        const d = new Date(now.getFullYear() - i, 0, 1);
        const start = new Date(d.getFullYear(), 0, 1);
        const end = new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
        return { start, end, label: getLabel(d) };
      };
    } else {
      // all time
      const firstTxn = await Transaction.findOne(userFilter).sort({ date: 1 });
      const start = firstTxn ? firstTxn.date : new Date(now.getFullYear(), now.getMonth(), 1);
      const end = now;
      periods.push({ start, end, label: 'All Time' });
    }

    if (period !== 'all') {
      for (let i = 5; i >= 0; i--) {
        periods.push(getStartEnd(i));
      }
    }

    // For each period, aggregate income and expenses (only approved)
    const data = [];
    for (const p of periods) {
      const [incomeAgg, expenseAgg] = await Promise.all([
        Transaction.aggregate([
          { $match: { ...userFilter, type: 'income', date: { $gte: p.start, $lte: p.end } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Transaction.aggregate([
          { $match: { ...userFilter, type: 'expense', date: { $gte: p.start, $lte: p.end } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);
      data.push({
        period: p.label,
        income: incomeAgg[0]?.total || 0,
        expenses: expenseAgg[0]?.total || 0,
      });
    }

    // Expense category breakdown (all time)
    const categoryBreakdown = await Transaction.aggregate([
      { $match: { user: userId, type: 'expense' } },
      { $group: { _id: '$category', value: { $sum: '$amount' } } },
      { $sort: { value: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        monthly: data,
        categories: categoryBreakdown.map((c) => ({ name: c._id, value: c.value })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

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
    let userFilter = { status: 'Approved' };
    if (req.user.role !== 'hr') {
      userFilter.user = new mongoose.Types.ObjectId(req.user.id);
    }

    // Aggregate totals by type (only approved)
    const [incomeAgg, expenseAgg, recentTxns, accountAgg] = await Promise.all([
      Transaction.aggregate([
        { $match: { ...userFilter, type: 'income', ...dateMatch } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        { $match: { ...userFilter, type: 'expense', ...dateMatch } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Transaction.find({ ...userFilter, ...dateMatch })
        .populate('account', 'name bankName')
        .sort({ date: -1 })
        .limit(10),
      Transaction.aggregate([
        { $match: { ...userFilter, ...dateMatch } },
        { $group: { _id: '$account', total: { $sum: '$amount' }, type: { $push: '$type' } } },
      ]),
    ]);

    const totalIncome = incomeAgg[0]?.total || 0;
    const totalExpenses = expenseAgg[0]?.total || 0;
    const netBalance = totalIncome - totalExpenses;
    const transactionCount = (incomeAgg[0]?.count || 0) + (expenseAgg[0]?.count || 0);

    // Per-account totals
    const accounts = accountAgg.map(a => ({
      account: a._id,
      total: a.total,
      types: a.type,
    }));

    res.json({
      success: true,
      data: {
        totalIncome,
        totalExpenses,
        netBalance,
        transactionCount,
        recentTransactions: recentTxns,
        accounts, // for per-bank totals if needed
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
