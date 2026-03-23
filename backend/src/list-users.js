/**
 * Lists all users in the database.
 * Run: cd backend && node src/list-users.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const listUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const users = await User.find({}).select('name email role isActive designation createdAt').sort({ createdAt: -1 });
    
    if (users.length === 0) {
      console.log('No users found in database.');
      process.exit(0);
    }

    console.log(`\\n📋 Found ${users.length} user(s):\\n`);
    console.table(users.map(u => ({
      Name: u.name,
      Email: u.email,
      Role: u.role,
      Active: u.isActive,
      Designation: u.designation || '-',
      Created: u.createdAt.toISOString().split('T')[0]
    })));

    console.log('\\n✅ Done.');
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

listUsers();

