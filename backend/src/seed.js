/**
 * Seeds a Super Admin account into the database.
 * Run once: node src/seed.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const existing = await User.findOne({ email: 'admin@expenditure.com' });
    if (existing) {
      console.log('Super admin already exists. Nothing to seed.');
      process.exit(0);
    }

 
    console.log('✅  Super admin created successfully');
    console.log('   Email:    admin@expenditure.com');
    console.log('   Password: Admin@123');
    console.log('   ⚠️  Change the password after first login!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
};

seed();
