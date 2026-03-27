require('dotenv').config();
const mongoose = require('mongoose');
const Team = require('./models/Team');
const Transaction = require('./models/Transaction');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/expenditure');

async function seedTeamsData() {
  try {
    console.log('🔍 Fetching user...');
    const user = await User.findOne({ email: 'mikecmx01@gmail.com' });
    if (!user) {
      console.log('❌ User not found. Please create user first.');
      return;
    }
    console.log('✅ Found user:', user.email);

    // Create teams
    console.log('\n📦 Creating teams...');
    await Team.deleteMany({ createdBy: user._id }); // Clean existing teams

    const teams = [
      { name: 'Marketing Team', color: '#3b82f6', members: [], createdBy: user._id },
      { name: 'Sales Team', color: '#10b981', members: [], createdBy: user._id },
      { name: 'Engineering Team', color: '#8b5cf6', members: [], createdBy: user._id },
      { name: 'HR Team', color: '#f59e0b', members: [], createdBy: user._id },
      { name: 'Finance Team', color: '#ef4444', members: [], createdBy: user._id }
    ];

    const createdTeams = await Team.insertMany(teams);
    console.log(`✅ Created ${createdTeams.length} teams`);

    // Update transactions to associate with teams
    console.log('\n🔄 Associating transactions with teams...');
    
    const transactions = await Transaction.find({ user: user._id });
    console.log(`Found ${transactions.length} transactions`);

    let updateCount = 0;
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      // Randomly assign team to ~80% of transactions
      if (Math.random() > 0.2) {
        const randomTeam = createdTeams[Math.floor(Math.random() * createdTeams.length)];
        tx.team = randomTeam._id;
        await tx.save();
        updateCount++;
      }
    }

    console.log(`✅ Updated ${updateCount} transactions with team assignments`);

    // Show distribution
    console.log('\n📊 Team distribution:');
    for (const team of createdTeams) {
      const count = await Transaction.countDocuments({ team: team._id });
      console.log(`   ${team.name}: ${count} transactions`);
    }

    console.log('\n✅ Team seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

seedTeamsData();
