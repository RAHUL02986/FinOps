const Goal = require('../models/Goal');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const nodemailer = require('nodemailer');

// Helper to get period start/end
function getPeriodRange(period, refDate) {
  const date = new Date(refDate);
  let start, end;
  if (period === 'monthly') {
    start = new Date(date.getFullYear(), date.getMonth(), 1);
    end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (period === 'quarterly') {
    const quarter = Math.floor(date.getMonth() / 3);
    start = new Date(date.getFullYear(), quarter * 3, 1);
    end = new Date(date.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
  } else if (period === 'yearly') {
    start = new Date(date.getFullYear(), 0, 1);
    end = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
  }
  return { start, end };
}

async function checkGoalsAndNotify(transaction) {
  // Only check for income/expense
  if (!['income', 'expense'].includes(transaction.type)) return;
  // Find all active goals of this type and period that include this transaction's date
  const goals = await Goal.find({
    type: transaction.type === 'income' ? 'revenue' : 'expense',
    status: 'active',
    startDate: { $lte: transaction.date },
    endDate: { $gte: transaction.date },
  });
  for (const goal of goals) {
    // Get all transactions of this type in the goal's period
    const { start, end } = getPeriodRange(goal.period, transaction.date);
    const sum = await Transaction.aggregate([
      { $match: {
        type: transaction.type,
        date: { $gte: start, $lte: end },
        status: { $ne: 'Draft' },
      } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const total = sum[0]?.total || 0;
    // If goal is reached and not already completed
    if (total >= goal.targetAmount && goal.status === 'active') {
      goal.status = 'completed';
      goal.currentAmount = total;
      await goal.save();
      // Notify all admins
      const admins = await User.find({ role: { $in: ['admin', 'superadmin'] }, isActive: true });
      for (const admin of admins) {
        // Send email
        await sendGoalReachedEmail(admin.email, goal, total);
      }
    } else {
      // Update currentAmount for progress
      goal.currentAmount = total;
      await goal.save();
    }
  }
}

async function sendGoalReachedEmail(email, goal, total) {
  // Use your SMTP config from .env
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  const subject = `Goal Reached: ${goal.title}`;
  const text = `Congratulations!\n\nThe goal "${goal.title}" (${goal.type}) for the period ${goal.period} has been reached.\nTarget: ₹${goal.targetAmount}\nAchieved: ₹${total}\n\n-- FinOps Tracker`;
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject,
    text,
  });
}

module.exports = { checkGoalsAndNotify };
