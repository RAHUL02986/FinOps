const express = require('express');
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
// Removed Income and Expense models; only Transaction is used
const { protect } = require('../middleware/auth');
const Notification = require('../models/Notification');

const ELEVATED = ['superadmin', 'hr', 'manager'];
const isElevated = (role) => ELEVATED.includes(role);

const router = express.Router();
router.use(protect);

// GET /api/transactions
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, type, category, source, page = 1, limit = 10, userId, status, account } = req.query;
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
    if (account) filter.account = account;
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
      .populate('user', 'name email role')
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
      // Set status to 'Pending' if HR or Manager, 'Draft' if Data Entry, else default
      let status = req.body.status;
      if (req.user.role === 'hr' || req.user.role === 'manager') status = 'Pending';
      if (req.user.role === 'dataentry') status = 'Draft';

      // Ensure date is saved as full ISO string if provided
      let txnDate = req.body.date;
      if (txnDate && !txnDate.includes('T')) {
        // If only date part, add current time
        txnDate = new Date(txnDate).toISOString();
      }
      // Validate minimum balance for expense transactions
      const Account = require('../models/Account');
      if (req.body.type === 'expense' && req.body.account) {
        const account = await Account.findById(req.body.account);
        if (account) {
          const minBalance = typeof account.minimumBalance === 'number' ? account.minimumBalance : 0;
          if ((account.currentBalance - req.body.amount) < minBalance) {
            return res.status(400).json({ 
              success: false, 
              message: `Insufficient balance. Account balance cannot go below minimum balance (₹${minBalance})` 
            });
          }
        }
      }

      const txn = await Transaction.create({
        ...req.body,
        date: txnDate || undefined,
        user: req.user.id,
        status: status || undefined,
      });

      // Update account balance for ALL account types
      if (txn.account) {
        const account = await Account.findById(txn.account);
        if (account) {
          if (account.type === 'od_cc') {
            // Handle OD/CC accounts
            if (txn.type === 'expense') {
              // Using OD/CC: decrease balance
              account.currentBalance = Math.max(0, account.currentBalance - txn.amount);
            } else if (txn.type === 'income') {
              // Repayment: increase balance, but not above creditLimit
              account.currentBalance = Math.min(account.creditLimit, account.currentBalance + txn.amount);
            }
          } else {
            // Handle regular accounts (current, savings, cash, upi)
            if (txn.type === 'expense') {
              // Deduct expense from account balance
              account.currentBalance -= txn.amount;
            } else if (txn.type === 'income') {
              // Add income to account balance
              account.currentBalance += txn.amount;
            }
          }
          await account.save();
        }
      }

      // Notify admin on new transaction (draft/pending/approved)
      const notifyType =
        status === 'Draft' ? 'transaction_created'
        : status === 'Pending' ? 'transaction_created'
        : 'transaction_created';
      const User = require('../models/User');
      const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
      for (const admin of admins) {
        await Notification.create({
          user: admin._id,
          type: notifyType,
          title: 'New Transaction Added',
          message: `${req.user.name} added a new transaction (${txn.type}, ₹${txn.amount})`,
          transaction: txn._id
        });
      }

      // Check goals and notify if needed
      const { checkGoalsAndNotify } = require('../utils/goalCheckAndNotify');
      await checkGoalsAndNotify(txn);

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

    // Store old values before update
    const oldAccount = txn.account;
    const oldAmount = txn.amount;
    const oldType = txn.type;

    const updated = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    // Update account balances if amount, account, or type changed
    const Account = require('../models/Account');
    if (req.body.amount !== undefined || req.body.account !== undefined || req.body.type !== undefined) {
      // Reverse the old transaction's effect on the old account
      if (oldAccount) {
        const oldAcc = await Account.findById(oldAccount);
        if (oldAcc) {
          if (oldAcc.type === 'od_cc') {
            if (oldType === 'expense') {
              // Reverse expense: add amount back
              oldAcc.currentBalance = Math.min(oldAcc.creditLimit, oldAcc.currentBalance + oldAmount);
            } else if (oldType === 'income') {
              // Reverse income: subtract amount
              oldAcc.currentBalance = Math.max(0, oldAcc.currentBalance - oldAmount);
            }
          } else {
            if (oldType === 'expense') {
              // Reverse expense: add amount back
              oldAcc.currentBalance += oldAmount;
            } else if (oldType === 'income') {
              // Reverse income: subtract amount
              oldAcc.currentBalance -= oldAmount;
            }
          }
          await oldAcc.save();
        }
      }

      // Apply the new transaction's effect on the new account
      if (updated.account) {
        const newAcc = await Account.findById(updated.account);
        if (newAcc) {
          if (newAcc.type === 'od_cc') {
            if (updated.type === 'expense') {
              newAcc.currentBalance = Math.max(0, newAcc.currentBalance - updated.amount);
            } else if (updated.type === 'income') {
              newAcc.currentBalance = Math.min(newAcc.creditLimit, newAcc.currentBalance + updated.amount);
            }
          } else {
            if (updated.type === 'expense') {
              newAcc.currentBalance -= updated.amount;
            } else if (updated.type === 'income') {
              newAcc.currentBalance += updated.amount;
            }
          }
          await newAcc.save();
        }
      }
    }

    // Notify user on approval/rejection
    if ('status' in req.body && (req.body.status === 'Approved' || req.body.status === 'Rejected')) {
      const Notification = require('../models/Notification');
      const txnUser = updated.user;
      const notifType = req.body.status === 'Approved' ? 'transaction_approved' : 'transaction_rejected';
      await Notification.create({
        user: txnUser,
        type: notifType,
        title: `Transaction ${req.body.status}`,
        message: `Your transaction (${updated.type}, ₹${updated.amount}) was ${req.body.status.toLowerCase()}.`,
        transaction: updated._id
      });
    }
    // Check goals and notify if needed after update
    const { checkGoalsAndNotify } = require('../utils/goalCheckAndNotify');
    await checkGoalsAndNotify(updated);
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

    // Reverse account balance for ALL account types
    if (txn.account) {
      const Account = require('../models/Account');
      const account = await Account.findById(txn.account);
      if (account) {
        if (account.type === 'od_cc') {
          // Handle OD/CC accounts
          if (txn.type === 'expense') {
            // Deleting an expense: add amount back
            account.currentBalance = Math.min(account.creditLimit, account.currentBalance + txn.amount);
          } else if (txn.type === 'income') {
            // Deleting a repayment: subtract amount (not below zero)
            account.currentBalance = Math.max(0, account.currentBalance - txn.amount);
          }
        } else {
          // Handle regular accounts (current, savings, cash, upi)
          if (txn.type === 'expense') {
            // Deleting an expense: add amount back
            account.currentBalance += txn.amount;
          } else if (txn.type === 'income') {
            // Deleting an income: subtract amount
            account.currentBalance -= txn.amount;
          }
        }
        await account.save();
      }
    }

    // No need to delete Income/Expense; dashboard uses only Transaction

    // Check goals and notify if needed after delete (pass a dummy transaction with date/type)
    const { checkGoalsAndNotify } = require('../utils/goalCheckAndNotify');
    if (txn) await checkGoalsAndNotify(txn);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
