const mongoose = require('./config/database');
const User = require('./models/User');

async function migrateVerifiedUsers() {
  try {
    await mongoose.connect();
    console.log('Connected to MongoDB');
    
    const result = await User.updateMany(
      { 
        role: { $in: ['admin', 'hr', 'manager', 'dataentry'] },
        isActive: true,
        isVerified: { $ne: true }  // Only update if not already true
      },
      { isVerified: true }
    );
    
    console.log(`Migration complete: Updated ${result.modifiedCount} users to isVerified=true`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateVerifiedUsers();

