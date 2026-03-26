const express = require('express');
const NotificationPreference = require('../models/NotificationPreference');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.use(protect);

// GET current user's notification preferences
router.get('/', async (req, res) => {
  try {
    let prefs = await NotificationPreference.findOne({ user: req.user._id });
    if (!prefs) {
      prefs = await NotificationPreference.create({ user: req.user._id });
    }
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update current user's notification preferences
router.put('/', async (req, res) => {
  try {
    const { invoiceReminders, payrollNotifications, expenseAlerts, proposalNotifications } = req.body;
    let prefs = await NotificationPreference.findOneAndUpdate(
      { user: req.user._id },
      { invoiceReminders, payrollNotifications, expenseAlerts, proposalNotifications },
      { new: true, upsert: true }
    );
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
