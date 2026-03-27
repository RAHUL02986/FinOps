const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/expenditure')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Sample categories
const expenseCategories = [
  'Rent', 'Salaries', 'Utilities', 'Marketing', 'Software Subscriptions',
  'Office Supplies', 'Transportation', 'Food & Dining', 'Healthcare',
  'Equipment', 'Insurance', 'Legal Fees', 'Consulting', 'Training'
];

const incomeCategories = [
  'Sales Revenue', 'Service Income', 'Consulting Revenue', 
  'Investment Income', 'Rental Income', 'Commission'
];

// Helper to generate random amount
const randomAmount = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper to create date for a specific month/year
const createDate = (year, month, day = null) => {
  const d = day || randomAmount(1, 28);
  return new Date(year, month, d, randomAmount(0, 23), randomAmount(0, 59));
};

// Generate transactions for a specific month
const generateMonthTransactions = (year, month, userId) => {
  const transactions = [];
  
  // Generate 15-25 expense transactions per month
  const expenseCount = randomAmount(15, 25);
  for (let i = 0; i < expenseCount; i++) {
    const category = expenseCategories[randomAmount(0, expenseCategories.length - 1)];
    let amount;
    
    // Make some categories consistently higher
    if (category === 'Rent') amount = randomAmount(15000, 25000);
    else if (category === 'Salaries') amount = randomAmount(40000, 60000);
    else if (category === 'Marketing') amount = randomAmount(5000, 15000);
    else if (category === 'Software Subscriptions') amount = randomAmount(2000, 8000);
    else amount = randomAmount(500, 10000);
    
    transactions.push({
      user: userId,
      amount,
      type: 'expense',
      category,
      description: `${category} payment for ${month + 1}/${year}`,
      date: createDate(year, month),
      status: 'Approved'
    });
  }
  
  // Generate 5-10 income transactions per month
  const incomeCount = randomAmount(5, 10);
  for (let i = 0; i < incomeCount; i++) {
    const category = incomeCategories[randomAmount(0, incomeCategories.length - 1)];
    let amount;
    
    if (category === 'Sales Revenue') amount = randomAmount(50000, 100000);
    else if (category === 'Service Income') amount = randomAmount(30000, 70000);
    else if (category === 'Consulting Revenue') amount = randomAmount(20000, 50000);
    else amount = randomAmount(5000, 30000);
    
    transactions.push({
      user: userId,
      amount,
      type: 'income',
      category,
      description: `${category} received for ${month + 1}/${year}`,
      date: createDate(year, month),
      status: 'Approved'
    });
  }
  
  return transactions;
};

async function seedData() {
  try {
    console.log('🌱 Starting to seed comparison test data...\n');
    
    // Get the first user from the database (you can change this to a specific user ID)
    const User = require('./models/User');
    const user = await User.findOne();
    
    if (!user) {
      console.error('❌ No user found in database. Please create a user first.');
      process.exit(1);
    }
    
    console.log(`👤 Using user: ${user.email} (${user._id})\n`);
    
    const allTransactions = [];
    
    // Generate data for 2024 (all 12 months)
    console.log('📅 Generating data for 2024...');
    for (let month = 0; month < 12; month++) {
      const monthTransactions = generateMonthTransactions(2024, month, user._id);
      allTransactions.push(...monthTransactions);
      const monthName = new Date(2024, month).toLocaleDateString('en-US', { month: 'short' });
      console.log(`   ✓ ${monthName} 2024: ${monthTransactions.length} transactions`);
    }
    
    // Generate data for 2025 (all 12 months)
    console.log('\n📅 Generating data for 2025...');
    for (let month = 0; month < 12; month++) {
      const monthTransactions = generateMonthTransactions(2025, month, user._id);
      allTransactions.push(...monthTransactions);
      const monthName = new Date(2025, month).toLocaleDateString('en-US', { month: 'short' });
      console.log(`   ✓ ${monthName} 2025: ${monthTransactions.length} transactions`);
    }
    
    // Generate data for 2026 (Jan, Feb, Mar)
    console.log('\n📅 Generating data for 2026...');
    for (let month = 0; month < 3; month++) {
      const monthTransactions = generateMonthTransactions(2026, month, user._id);
      allTransactions.push(...monthTransactions);
      const monthName = new Date(2026, month).toLocaleDateString('en-US', { month: 'short' });
      console.log(`   ✓ ${monthName} 2026: ${monthTransactions.length} transactions`);
    }
    
    // Insert all transactions
    console.log(`\n💾 Inserting ${allTransactions.length} transactions into database...`);
    await Transaction.insertMany(allTransactions);
    
    console.log('\n✅ Success! Seed data inserted successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Total Transactions: ${allTransactions.length}`);
    console.log(`   Time Period: Jan 2024 - Mar 2026`);
    console.log(`   Expense Categories: ${expenseCategories.length}`);
    console.log(`   Income Categories: ${incomeCategories.length}`);
    console.log('\n🎯 You can now test all comparison scenarios:');
    console.log('   ✓ Monthly: Feb 2026 vs Mar 2026');
    console.log('   ✓ Quarterly: Q1 2024 vs Q1 2025');
    console.log('   ✓ Semi-Yearly: H1 2024 vs H1 2025');
    console.log('   ✓ Yearly: 2024 vs 2025');
    console.log('   ✓ Custom: Any date range comparison\n');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding data:', err);
    process.exit(1);
  }
}

seedData();
