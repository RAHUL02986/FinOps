const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'task_assigned',
        'task_updated',
        'comment_added',
        'status_changed',
        'invoice_reminder',
        'payroll_notification',
        'expense_alert',
        'transaction_created',
        'transaction_approved',
        'transaction_rejected'
      ],
      default: 'task_assigned',
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, default: '', trim: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
