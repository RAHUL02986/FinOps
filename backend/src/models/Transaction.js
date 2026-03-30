const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    type: {
      type: String,
      enum: ['income', 'expense', 'transfer'],
      required: true,
    },
    category: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      trim: true,
    },
    account: {
      type: mongoose.Schema.ObjectId,
      ref: 'Account',
      required: [true, 'Account is required'],
    },
    team: {
      type: mongoose.Schema.ObjectId,
      ref: 'Team',
    },
    employee: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Approved', 'Pending', 'Rejected', 'Draft'],
      default: 'Approved',
    },
  },
  { timestamps: true }
);

TransactionSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
