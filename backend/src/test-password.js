/**
 * Test password for Manager User
 * Run: cmd /c "cd backend & node src\\test-password.js"
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

dotenv.config();

const testPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const email = 'rahul.codexmatrix@gmail.com';
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    const testPassword = 'Demo@123';
    const isMatch = await bcrypt.compare(testPassword, user.password);
    console.log(`User: ${user.name} (${user.email})`);
    console.log('Role:', user.role);
    console.log('Active:', user.isActive);
    console.log('Password match:', isMatch);

    mongoose.connection.close();
    process.exit(isMatch ? 0 : 1);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

testPassword();

