const mongoose = require('mongoose');

const NotificationPreferenceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  invoiceReminders: { type: Boolean, default: true },
  payrollNotifications: { type: Boolean, default: true },
  expenseAlerts: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('NotificationPreference', NotificationPreferenceSchema);