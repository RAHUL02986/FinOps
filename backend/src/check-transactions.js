const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/expenditure')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

async function checkTransactions() {
  try {
    const count = await Transaction.countDocuments();
    console.log(`\n📊 Total transactions in database: ${count}\n`);
    
    if (count === 0) {
      console.log('❌ No transactions found in database');
    } else {
      // Check transactions by year
      const years = [2024, 2025, 2026];
      for (const year of years) {
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);
        const yearCount = await Transaction.countDocuments({
          date: { $gte: startDate, $lte: endDate }
        });
        console.log(`${year}: ${yearCount} transactions`);
      }
      
      // Show some recent transactions
      console.log('\n📝 Recent transactions:');
      const recent = await Transaction.find().sort({ date: -1 }).limit(5);
      recent.forEach(t => {
        console.log(`  - ${t.date.toISOString().split('T')[0]}: ${t.type} - ${t.category} - ₹${t.amount}`);
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

checkTransactions();
