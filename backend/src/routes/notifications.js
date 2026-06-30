const express = require('express');
const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.use(protect);

// GET /api/notifications - Get notifications for current user, filtered by preferences
router.get('/', async (req, res) => {
  try {
    // Get user preferences
    const prefs = await NotificationPreference.findOne({ user: req.user._id });
    const filter = { user: req.user._id };
    if (prefs) {
      // Filter by notification type based on preferences
      const allowedTypes = [];
      if (prefs.invoiceReminders) allowedTypes.push('invoice_reminder');
      if (prefs.payrollNotifications) allowedTypes.push('payroll_notification');
      if (prefs.expenseAlerts) {
        allowedTypes.push('expense_alert');
        allowedTypes.push('transaction_created', 'transaction_approved', 'transaction_rejected');
      }
      if (prefs.proposalNotifications) allowedTypes.push('proposal_notification');
      if (prefs.leadNotifications) allowedTypes.push('lead_notification');
      if (allowedTypes.length > 0) {
        filter.type = { $in: allowedTypes };
      } else {
        // If all preferences are off, return empty
        return res.json([]);
      }
    }
    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    res.json(notif);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
