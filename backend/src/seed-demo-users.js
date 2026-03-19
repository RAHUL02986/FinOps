/**
 * Seeds demo users into the database for role-based dashboard testing.
 * Run: node src/seed-demo-users.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const users = [
  {
    name: 'Data Entry User',
    email: 'michelle06.cmx@gmail.com',
    password: 'Demo@123',
    role: 'user',
  },
  {
    name: 'HR User',
    email: 'himanshukumar.codexmatrix@gmail.com',
    password: 'Demo@123',
    role: 'hr',
  },
  {
    name: 'Manager User',
    email: 'rahul.codexmatrix@gmail.com',
    password: 'Demo@123',
    role: 'manager',
  },
  {
    name: 'Administrator',
    email: 'abhishekbhatt9011@gmail.com',
    password: 'Demo@123',
    role: 'superadmin',
  },
];

const seedDemoUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const user of users) {
      const exists = await User.findOne({ email: user.email });
      if (exists) {
        console.log(`User already exists: ${user.email}`);
        continue;
      }
      await User.create(user);
      console.log(`Created user: ${user.email} | Password: ${user.password} | Role: ${user.role}`);
    }
    console.log('✅  Demo users seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
};

seedDemoUsers();
