// This file sets up a scheduled job to send recurring expense reminders automatically
console.log('[CRON] recurringExpenseReminder.cron.js loaded');
const { sendRecurringExpenseReminders } = require('./recurringExpenseReminder');
const cron = require('node-cron');

// Schedule: every day at 1:15PM server time
cron.schedule('00 9 * * *', async () => {
  console.log('[CRON] Running recurring expense reminder job at 13:15');
  try {
    await sendRecurringExpenseReminders();
    console.log('[CRON] Recurring expense reminders processed.');
  } catch (err) {
    console.error('[CRON] Error sending recurring expense reminders:', err);
  }
});

// Export nothing, just require this file in server.js to activate
