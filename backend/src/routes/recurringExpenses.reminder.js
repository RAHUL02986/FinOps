const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');
const { sendRecurringExpenseReminders } = require('../scheduler/recurringExpenseReminder');

// POST /api/recurring-expenses/send-reminders
// Only superadmin can trigger
router.post('/send-reminders', protect, authorize('superadmin'), async (req, res) => {
  try {
    await sendRecurringExpenseReminders();
    res.json({ message: 'Recurring expense reminders processed and emails sent if due.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
