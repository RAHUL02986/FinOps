const express = require('express');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const getPeriodStart = (period) => {
  const now = new Date();
  switch (period) {
    case 'day':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'week':
      // Last 7 days including today
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    case '15days':
      // Last 15 days including today
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'lastMonth':
      // First day of last month
      return new Date(now.getFullYear(), now.getMonth() - 1, 1);
    case 'last2Months':
      // First day of 2 months ago
      return new Date(now.getFullYear(), now.getMonth() - 2, 1);
    case 'last3Months':
      // First day of 3 months ago
      return new Date(now.getFullYear(), now.getMonth() - 3, 1);
    case 'last6Months':
      // First day of 6 months ago
      return new Date(now.getFullYear(), now.getMonth() - 6, 1);
    case 'quarter':
      return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    case 'lastYear':
      // First day of last year
      return new Date(now.getFullYear() - 1, 0, 1);
    default:
      return null;
  }
};

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  try {
    const { period = 'month', startDate, endDate, team, employee } = req.query;

    let dateMatch = {};
    
    // Handle custom date range
    if (period === 'custom' && startDate && endDate) {
      dateMatch = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      const periodStart = getPeriodStart(period);
      if (periodStart) {
        dateMatch = { date: { $gte: periodStart } };
      }
    }
    
    let matchBase = { status: 'Approved', ...dateMatch };
    if (team) {
      matchBase.team = new mongoose.Types.ObjectId(team);
    }
    if (employee) {
      matchBase.employee = new mongoose.Types.ObjectId(employee);
    }
    // All users, including admin/superadmin, see only approved transactions
    // If you want to restrict to user's own transactions, uncomment below:
    // if (req.user.role !== 'superadmin' && req.user.role !== 'hr') {
    //   matchBase.user = new mongoose.Types.ObjectId(req.user.id);
    // }

    const Account = require('../models/Account');
    // Get all accounts with isActive true
    const [incomeAgg, expenseAgg, recentTxns, allAccounts, odAccounts] = await Promise.all([
      Transaction.aggregate([
        { $match: { ...matchBase, type: 'income' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        { $match: { ...matchBase, type: 'expense' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Transaction.find(matchBase).sort({ date: -1 }).limit(10),
      Account.find({ isActive: true }),
      Account.find({ isActive: true, type: 'od_cc' }),
    ]);

    const totalIncome = incomeAgg[0]?.total || 0;
    const totalExpenses = expenseAgg[0]?.total || 0;
    const transactionCount = (incomeAgg[0]?.count || 0) + (expenseAgg[0]?.count || 0);

    const recentTransactions = recentTxns.map((t) => ({ ...t.toObject(), type: t.type }));

    // Calculate available funds (sum of all account balances where includeInAvailableFunds is true)
    const availableFunds = allAccounts.filter(acc => acc.includeInAvailableFunds).reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);


    // Calculate OD/CC metrics
    const odTotalLimit = odAccounts.reduce((sum, acc) => sum + (acc.creditLimit || 0), 0);
    const odCurrentBalance = odAccounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
    const odAccountIds = odAccounts.map(acc => acc._id);
    // Used OD/CC Balance: sum of all OD/CC expense transactions (negative value, 0 if unused)
    const odUsedAgg = await Transaction.aggregate([
      { $match: { ...matchBase, type: 'expense', account: { $in: odAccountIds } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const odUsedTotal = odUsedAgg[0]?.total ? -odUsedAgg[0].total : 0;
    const odLimitRemaining = odCurrentBalance; // Remaining OD/CC limit

    // Category breakdown for income and expenses
    const [incomeByCat, expenseByCat] = await Promise.all([
      Transaction.aggregate([
        { $match: { ...matchBase, type: 'income' } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } }
      ]),
      Transaction.aggregate([
        { $match: { ...matchBase, type: 'expense' } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } }
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
        transactionCount,
        recentTransactions,
        availableFunds,
        odLimitRemaining, // Remaining OD/CC limit (for OD Limit Used box)
        odUsedTotal, // Total OD/CC used (for Revenue box)
        hasOdAccounts: odAccounts.length > 0,
        incomeByCat,
        expenseByCat,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/dashboard/chart
router.get('/chart', async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;

    const isHr = req.user.role === 'hr';
    const userId = mongoose.isValidObjectId(req.user.id) ? new mongoose.Types.ObjectId(req.user.id) : null;
    // superadmin and hr see all, others see only their own
    // All users, including admin/superadmin, see only approved transactions
    const userMatch = { status: 'Approved' };
    
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

    // Expense category breakdown - apply date filter based on period or custom range
    let categoryDateMatch = {};
    if (period === 'custom' && startDate && endDate) {
      categoryDateMatch = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      const periodStart = getPeriodStart(period);
      if (periodStart) {
        categoryDateMatch = { date: { $gte: periodStart } };
      }
    }
    
    const categoryBreakdown = await Transaction.aggregate([
      { $match: { ...userMatch, status: 'Approved', type: 'expense', ...categoryDateMatch } },
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
