// Load environment variables from .env relative to execution location
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
console.log('[Scheduler] Loaded .env file');
console.log("[Scheduler] Script started: recurringExpenseReminder.js");

const mongoose = require('mongoose');
const RecurringExpense = require('../models/RecurringExpense');
const User = require('../models/User');
const SmtpConfig = require('../models/SmtpConfig');
const nodemailer = require('nodemailer');

// Set up process crash dampeners
process.on('uncaughtException', (err) => {
  console.error('[Scheduler] Uncaught Exception caught at process root:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Scheduler] Unhandled Rejection caught at promise root:', reason);
  process.exit(1);
});

// Shared safe network timeout configurations to protect background workers
const mailTimeoutOptions = {
  connectionTimeout: 10000, // 10 seconds max to open socket
  greetingTimeout: 10000,   // 10 seconds max to receive greeting banner
  socketTimeout: 15000,     // 15 seconds max inactivity threshold
  tls: {
    rejectUnauthorized: false // Bypasses self-signed certificate errors on cloud containers
  }
};

async function sendRecurringExpenseReminders() {
  try {
    // 1. Initialize database connection cleanly
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('[Scheduler] Database connection established.');
    }

    const today = new Date();
    // Clear time factors to ensure accurate day-to-day calendar matching
    const todayZeroed = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // 2. Locate active expenses
    const expenses = await RecurringExpense.find({ status: 'active' });
    if (expenses.length === 0) {
      console.log("[Scheduler] No active recurring expenses found to analyze.");
      return;
    }

    // 3. Resolve unified SMTP configuration from database or fallback to environment variables
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

    // 4. Iterate over active records
    for (const exp of expenses) {
      if ((!exp.reminderDaysBefore && exp.reminderDaysBefore !== 0) || !exp.nextDueDate) {
        console.log(`[SKIP] Expense '${exp.title}' missing reminderDaysBefore or nextDueDate properties.`);
        continue;
      }

      // Calculate target date when reminder should fire
      const dueDate = new Date(exp.nextDueDate);
      const reminderDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      reminderDate.setDate(reminderDate.getDate() - exp.reminderDaysBefore);

      console.log(`[DEBUG] Expense: '${exp.title}', Today: ${todayZeroed.toISOString().slice(0, 10)}, Target Reminder Date: ${reminderDate.toISOString().slice(0, 10)}, Next Due Date: ${dueDate.toISOString().slice(0, 10)}`);

      // Compare absolute values of times to check matching dates safely
      const isReminderDay = todayZeroed.getTime() === reminderDate.getTime();

      if (isReminderDay) {
        // Query active superadmins to dispatch reminder messages
        const admins = await User.find({ role: 'superadmin', isActive: true });
        if (admins.length === 0) {
          console.log(`[WARN] No superadmin users discovered in database to receive notification for: '${exp.title}'.`);
          continue;
        }

        for (const admin of admins) {
          try {
            await transporter.sendMail({
              from: `"${fromName}" <${fromEmail}>`,
              to: admin.email,
              subject: `Recurring Expense Reminder: ${exp.title}`,
              text: `Dear Admin,\n\nYour recurring expense "${exp.title}" (amount: ₹${exp.amount}) is due in ${exp.reminderDaysBefore} days (on ${dueDate.toDateString()}).\n\nPlease review and process this expense accordingly.\n\n--\nAutomated System Reminder`,
            });
            console.log(`[EMAIL SENT] Reminder notification for '${exp.title}' successfully dispatched to ${admin.email}`);
          } catch (mailErr) {
            console.error(`[ERROR] Failed to dispatch reminder mail for context '${exp.title}' targeting ${admin.email}:`, mailErr.message);
          }
        }
      } else {
        console.log(`[NO ACTION] Current date does not match target date execution path for expense: '${exp.title}'. Next notification will fire on ${reminderDate.toDateString()}`);
      }
    }
  } catch (err) {
    console.error('[Scheduler] Fatal internal execution crash inside routine runner:', err);
    throw err; // Escalate out to ensure parent processes catch execution failure states
  } finally {
    // Always tear down connection socket instances safely when code block wraps execution lifecycle loops
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('[Scheduler] Database safely disconnected.');
    }
  }
}

// Process wrapper routing execution blocks cleanly for standalone crons
if (require.main === module) {
  sendRecurringExpenseReminders()
    .then(() => {
      console.log('[Scheduler] Recurring expense reminders evaluation round complete.');
      process.exit(0);
    })
    .catch(err => {
      console.error('[Scheduler] Standalone process script failure encountered:', err);
      process.exit(1);
    });
}

module.exports = { sendRecurringExpenseReminders };