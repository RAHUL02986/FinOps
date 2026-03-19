const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 200 },
  type: {
    type: String,
    enum: ['revenue', 'expense', 'savings'],
    required: true
  },
  targetAmount: { type: Number, required: true, min: 0 },
  currentAmount: { type: Number, default: 0 },
  period: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['active', 'completed', 'missed'],
    default: 'active'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

goalSchema.index({ createdBy: 1, status: 1 });

module.exports = mongoose.model('Goal', goalSchema);
