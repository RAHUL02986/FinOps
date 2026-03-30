const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const Transaction = require('../models/Transaction');

router.use(protect);


// GET reports - spending by category (from Transaction)
router.get('/spending-by-category', async (req, res) => {
  try {
    const { startDate, endDate, team, employee } = req.query;
    const dateMatch = {};
    if (startDate || endDate) {
      dateMatch.date = {};
      if (startDate) dateMatch.date.$gte = new Date(startDate);
      if (endDate) dateMatch.date.$lte = new Date(endDate);
    }
    // Add team filter if provided
    if (team) {
      dateMatch.team = new mongoose.Types.ObjectId(team);
    }
    // Add employee filter if provided
    if (employee) {
      dateMatch.employee = new mongoose.Types.ObjectId(employee);
    }

    // Debug log for filter
    console.log('dateMatch:', dateMatch);
    // Expenses by category
    const expenseResult = await Transaction.aggregate([
      { $match: { type: 'expense', ...dateMatch } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);
    console.log('expenseResult:', expenseResult);
    const expenseGrandTotal = expenseResult.reduce((s, r) => s + r.total, 0);
    const expenseData = expenseResult.map(r => ({
      category: r._id,
      total: r.total,
      count: r.count,
      percentage: expenseGrandTotal > 0 ? ((r.total / expenseGrandTotal) * 100).toFixed(1) : 0
    }));

    // Income by category
    const incomeResult = await Transaction.aggregate([
      { $match: { type: 'income', ...dateMatch } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);
    const incomeGrandTotal = incomeResult.reduce((s, r) => s + r.total, 0);
    const incomeData = incomeResult.map(r => ({
      category: r._id,
      total: r.total,
      count: r.count,
      percentage: incomeGrandTotal > 0 ? ((r.total / incomeGrandTotal) * 100).toFixed(1) : 0
    }));

    res.json({
      expenses: { data: expenseData, grandTotal: expenseGrandTotal },
      income: { data: incomeData, grandTotal: incomeGrandTotal }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET monthly trends (last 12 months) from Transaction
router.get('/monthly-trends', async (req, res) => {
  try {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }

    const trends = [];
    for (const m of months) {
      const start = new Date(m.year, m.month - 1, 1);
      const end = new Date(m.year, m.month, 0, 23, 59, 59);

      const [incomeResult, expenseResult] = await Promise.all([
        Transaction.aggregate([
          { $match: { type: 'income', date: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Transaction.aggregate([
          { $match: { type: 'expense', date: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
      ]);

      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      trends.push({
        month: `${monthNames[m.month - 1]} ${m.year}`,
        income: incomeResult[0]?.total || 0,
        expenses: expenseResult[0]?.total || 0,
        net: (incomeResult[0]?.total || 0) - (expenseResult[0]?.total || 0)
      });
    }

    res.json(trends);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET summary stats from Transaction
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [monthlyIncome, monthlyExpenses, totalIncome, totalExpenses] = await Promise.all([
      Transaction.aggregate([
        { $match: { type: 'income', date: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        { $match: { type: 'expense', date: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        { $match: { type: 'income' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        { $match: { type: 'expense' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    res.json({
      monthlyIncome: monthlyIncome[0]?.total || 0,
      monthlyExpenses: monthlyExpenses[0]?.total || 0,
      monthlyPnL: (monthlyIncome[0]?.total || 0) - (monthlyExpenses[0]?.total || 0),
      totalIncome: totalIncome[0]?.total || 0,
      totalExpenses: totalExpenses[0]?.total || 0,
      totalPnL: (totalIncome[0]?.total || 0) - (totalExpenses[0]?.total || 0)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
