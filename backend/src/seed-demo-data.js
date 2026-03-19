const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./config/database');
const Income = require('./models/Income');
const Expense = require('./models/Expense');
const Transaction = require('./models/Transaction');
const User = require('./models/User');

const seedDemoData = async () => {
  await connectDB();

  const user = await User.findOne({ role: 'superadmin' });
  if (!user) {
    console.log('No superadmin user found. Run seed-demo-users.js first.');
    process.exit(1);
  }

  // Migrate Transactions to Income and Expense
  const transactions = await Transaction.find({});

  // Remove all incomes and expenses for all users in transactions
  const userIds = [...new Set(transactions.map(t => t.user.toString()))];
  await Income.deleteMany({ user: { $in: userIds } });
  await Expense.deleteMany({ user: { $in: userIds } });

  const incomeDocs = [];
  const expenseDocs = [];

  // Allowed categories for Expense
  const ALLOWED_CATEGORIES = [
    'Food & Dining',
    'Transportation',
    'Housing',
    'Entertainment',
    'Healthcare',
    'Shopping',
    'Education',
    'Utilities',
    'Travel',
    'Other',
  ];

  for (const t of transactions) {
    if (t.type === 'income') {
      incomeDocs.push({
        user: t.user,
        amount: t.amount,
        source: t.source || 'Other',
        description: t.description,
        date: t.date,
      });
    } else if (t.type === 'expense') {
      let category = (t.category || '').trim();
      // Find a valid category ignoring case and whitespace
      const validCategory = ALLOWED_CATEGORIES.find(
        c => c.toLowerCase() === category.toLowerCase()
      );
      if (!validCategory) category = 'Other';
      else category = validCategory;
      expenseDocs.push({
        user: t.user,
        amount: t.amount,
        category,
        description: t.description,
        date: t.date,
        approved: t.status === 'Approved',
      });
    }
  }

  if (incomeDocs.length > 0) await Income.insertMany(incomeDocs);
  if (expenseDocs.length > 0) await Expense.insertMany(expenseDocs);

  console.log(`✅ Migrated ${incomeDocs.length} incomes and ${expenseDocs.length} expenses from transactions!`);
  process.exit(0);
};

seedDemoData().catch(console.error);

