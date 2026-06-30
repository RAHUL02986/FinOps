// Migration script: migrate income and expenses to transactions
const mongoose = require('mongoose');
const Expense = require('./models/Expense');
const Income = require('./models/Income');
const Transaction = require('./models/Transaction');

const MONGO_URI = 'mongodb://localhost:27017/expenditure'; // Change if needed

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Migrate Expenses
  const expenses = await Expense.find();
  for (const exp of expenses) {
    await Transaction.create({
      user: exp.user,
      amount: exp.amount,
      type: 'expense',
      category: exp.category,
      description: exp.description,
      date: exp.date,
      status: 'Approved',
    });
  }
  console.log(`Migrated ${expenses.length} expenses.`);

  // Migrate Income
  const incomes = await Income.find();
  for (const inc of incomes) {
    await Transaction.create({
      user: inc.user,
      amount: inc.amount,
      type: 'income',
      source: inc.source,
      description: inc.description,
      date: inc.date,
      status: 'Approved',
    });
  }
  console.log(`Migrated ${incomes.length} incomes.`);

  await mongoose.disconnect();
  console.log('Migration complete.');
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
