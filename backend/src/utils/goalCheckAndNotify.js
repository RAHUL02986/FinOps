const Goal = require('../models/Goal');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const SmtpConfig = require('../models/SmtpConfig');
const nodemailer = require('nodemailer');

// Shared safe network timeout thresholds to avoid stalling API transaction streams
const mailTimeoutOptions = {
  connectionTimeout: 10000, // 10 seconds max to establish connection
  greetingTimeout: 10000,   // 10 seconds max to wait for greeting
  socketTimeout: 15000,     // 15 seconds max inactivity limit
  tls: {
    rejectUnauthorized: false // Bypasses local SSL check crashes on Linux containers
  }
};

// Helper to reliably construct absolute calendar date boundaries
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
  } else {
    // Structural fallback case if an unhandled period variant is passed
    start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }
  return { start, end };
}

async function checkGoalsAndNotify(transaction) {
  try {
    // Only intercept verified core asset variants
    if (!transaction || !['income', 'expense'].includes(transaction.type)) return;

    const txDate = transaction.date ? new Date(transaction.date) : new Date();

    // Locate active target goals validating the chronological transaction placement window
    const goals = await Goal.find({
      type: transaction.type === 'income' ? 'revenue' : 'expense',
      status: 'active',
      startDate: { $lte: txDate },
      endDate: { $gte: txDate },
    });

    if (goals.length === 0) return;

    // Cache administrative users early to minimize recurrent database operations
    let admins = [];
    let checkedAdmins = false;

    // Array tracking operations to execute simultaneously 
    const goalSavePromises = [];
    const goalsReachedList = [];

    for (const goal of goals) {
      const { start, end } = getPeriodRange(goal.period, txDate);

      // Aggregate financial streams matching timeframe spans
      const sum = await Transaction.aggregate([
        {
          $match: {
            type: transaction.type,
            date: { $gte: start, $lte: end },
            status: { $ne: 'Draft' },
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      const total = sum[0]?.total || 0;
      goal.currentAmount = total;

      // Evaluate objective threshold triggers
      if (total >= goal.targetAmount && goal.status === 'active') {
        goal.status = 'completed';
        goalsReachedList.push({ goal: goal.toObject(), total });

        // Lazy-load admins exactly once if a goal completion actually triggers
        if (!checkedAdmins) {
          admins = await User.find({ role: { $in: ['admin', 'superadmin'] }, isActive: true });
          checkedAdmins = true;
        }
      }

      goalSavePromises.push(goal.save());
    }

    // Resolve structural modifications concurrently to free database connections quickly
    await Promise.all(goalSavePromises);

    // If goals crossed targets, offload email notifications to a separate macro-task execution thread.
    // This allows the principal transaction function to complete instantly, preventing long API hangs.
    if (goalsReachedList.length > 0 && admins.length > 0) {
      setImmediate(async () => {
        try {
          // Pull setting configurations from centralized storage pools
          let smtpConfig = await SmtpConfig.findOne({ type: 'system', isActive: true });
          if (!smtpConfig) smtpConfig = await SmtpConfig.findOne({ type: 'invoice', isActive: true });

          const transportConfig = smtpConfig ? {
            host: smtpConfig.host,
            port: Number(smtpConfig.port),
            secure: Number(smtpConfig.port) === 465,
            auth: { user: smtpConfig.user, pass: smtpConfig.pass },
            ...mailTimeoutOptions
          } : {
            host: process.env.SMTP_HOST || 'smtp.example.com',
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: parseInt(process.env.SMTP_PORT, 10) === 465,
            auth: {
              user: process.env.SMTP_USER || 'user@example.com',
              pass: process.env.SMTP_PASS || 'password'
            },
            ...mailTimeoutOptions
          };

          const transporter = nodemailer.createTransport(transportConfig);
          const fromEmail = smtpConfig?.fromEmail || process.env.SMTP_USER || 'noreply@example.com';
          const fromName = smtpConfig?.fromName || process.env.COMPANY_NAME || 'FinOps Automations';

          // Asynchronously distribute mail notification loops to admins
          for (const item of goalsReachedList) {
            for (const admin of admins) {
              try {
                const subject = `Goal Reached: ${item.goal.title}`;
                const text = `Congratulations!\n\nThe goal "${item.goal.title}" (${item.goal.type}) for the period ${item.goal.period} has been reached.\n\nTarget: ₹${item.goal.targetAmount}\nAchieved: ₹${item.total}\n\n-- FinOps Tracker`;

                await transporter.sendMail({
                  from: `"${fromName}" <${fromEmail}>`,
                  to: admin.email,
                  subject,
                  text,
                });
                console.log(`[GOAL REACHED] Notification email successfully dispatched to admin: ${admin.email}`);
              } catch (mailError) {
                console.error(`[ERROR] Notification routing failed targeting admin ${admin.email}:`, mailError.message);
              }
            }
          }
        } catch (bgError) {
          console.error('[ERROR] Failed executing background goal alert routine:', bgError.message);
        }
      });
    }
  } catch (err) {
    // Capture and cleanly handle errors to prevent crashes during lifecycle states
    console.error('[ERROR] System anomaly encountered within checkGoalsAndNotify context loop:', err.message);
  }
}

module.exports = { checkGoalsAndNotify };