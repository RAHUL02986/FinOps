const mongoose = require('mongoose');

const recurringExpenseSchema = new mongoose.Schema({
    paymentHistory: [{
      paidAt: { type: Date, required: true },
      amount: { type: Number, required: true },
      method: { type: String }, // e.g., 'manual', 'auto', 'bank', etc.
      note: { type: String }
    }],
  title: { type: String, required: true, maxlength: 200 },
  amount: { type: Number, required: true, min: 0.01 },
  category: {
    type: String,
    enum: ['Food & Dining', 'Transportation', 'Housing', 'Entertainment', 'Healthcare', 'Shopping', 'Education', 'Utilities', 'Travel', 'Subscriptions', 'Insurance', 'Rent', 'Salaries', 'Other'],
    required: true
  },
  description: { type: String, maxlength: 500 },
  frequency: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'yearly', 'custom'],
    default: 'monthly'
  },
  customDays: { type: Number }, // for custom frequency
  nextDueDate: { type: Date, required: true },
  lastPaidDate: { type: Date },
  reminderDaysBefore: { type: Number, default: 3 },
  status: {
    type: String,
    enum: ['active', 'paused', 'archived'],
    default: 'active'
  },
  autoCreateTransaction: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

recurringExpenseSchema.index({ createdBy: 1, status: 1 });
recurringExpenseSchema.index({ nextDueDate: 1 });

module.exports = mongoose.model('RecurringExpense', recurringExpenseSchema);
