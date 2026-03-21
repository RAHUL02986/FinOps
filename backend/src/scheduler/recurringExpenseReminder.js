// Load environment variables from .env
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
console.log('[Scheduler] Loaded .env file');
console.log("[Scheduler] Script started: recurringExpenseReminder.js");

process.on('uncaughtException', (err) => {
  console.error('[Scheduler] Uncaught Exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Scheduler] Unhandled Rejection:', reason);
  process.exit(1);
});

// Wrap main logic in async IIFE with try/catch
(async () => {
  try {
// ...existing code...
  } catch (err) {
    console.error('[Scheduler] Fatal error in main logic:', err);
    process.exit(1);
  }
})();
// backend/src/scheduler/recurringExpenseReminder.js
// Scheduler to send email reminders to admin before recurring expense due date

const mongoose = require('mongoose');
const RecurringExpense = require('../models/RecurringExpense');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const { default: config } = require('../config/database');

// Setup nodemailer transport (customize as per your SMTP config)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'user@example.com',
    pass: process.env.SMTP_PASS || 'password',
  },
});

async function sendRecurringExpenseReminders() {
  await mongoose.connect(process.env.MONGODB_URI);
  const today = new Date();
  const expenses = await RecurringExpense.find({ status: 'active' });
  for (const exp of expenses) {
    if (!exp.reminderDaysBefore && exp.reminderDaysBefore !== 0 || !exp.nextDueDate) {
      console.log(`[SKIP] Expense '${exp.title}' missing reminderDaysBefore or nextDueDate.`);
      continue;
    }
    const reminderDate = new Date(exp.nextDueDate);
    reminderDate.setDate(reminderDate.getDate() - exp.reminderDaysBefore);
    console.log(`[DEBUG] Expense: '${exp.title}', Today: ${today.toISOString().slice(0,10)}, ReminderDate: ${reminderDate.toISOString().slice(0,10)}, NextDueDate: ${new Date(exp.nextDueDate).toISOString().slice(0,10)}, ReminderDaysBefore: ${exp.reminderDaysBefore}`);
    const isReminderDay = (
      today.getFullYear() === reminderDate.getFullYear() &&
      today.getMonth() === reminderDate.getMonth() &&
      today.getDate() === reminderDate.getDate()
    );
    if (isReminderDay) {
      // Find all admins
      const admins = await User.find({ role: 'superadmin', isActive: true });
      if (admins.length === 0) {
        console.log(`[WARN] No admin users found to send reminder for '${exp.title}'.`);
      }
      for (const admin of admins) {
        try {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@example.com',
            to: admin.email,
            subject: `Recurring Expense Reminder: ${exp.title}`,
            text: `Dear Admin,\n\nYour recurring expense \"${exp.title}\" (amount: ₹${exp.amount}) is due in ${exp.reminderDaysBefore} days (on ${exp.nextDueDate.toDateString()}).\n\nPlease review and process this expense.\n\n--\nAutomated Reminder`,
          });
          console.log(`[EMAIL SENT] Reminder for '${exp.title}' sent to ${admin.email}`);
        } catch (err) {
          console.error(`[ERROR] Failed to send reminder for '${exp.title}' to ${admin.email}:`, err);
        }
      }
    } else {
      console.log(`[NO ACTION] Today is not reminder day for '${exp.title}'. Reminder will be sent on ${reminderDate.toDateString()}`);
    }
  }
  await mongoose.disconnect();
}

// To be run via cron or scheduler
if (require.main === module) {
  sendRecurringExpenseReminders().then(() => {
    console.log('Recurring expense reminders processed.');
    process.exit(0);
  }).catch(err => {
    console.error('Error sending reminders:', err);
    process.exit(1);
  });
}

module.exports = { sendRecurringExpenseReminders };
