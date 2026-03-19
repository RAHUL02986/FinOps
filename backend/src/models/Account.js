const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 100 },
  type: {
    type: String,
    enum: ['current', 'savings', 'od_cc', 'cash', 'upi'],
    required: true
  },
  bankName: { type: String, default: '' },
  accountNumber: { type: String, default: '' },
  currentBalance: { type: Number, default: 0 },
  openingBalance: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  isActive: { type: Boolean, default: true },
  creditLimit: { type: Number, default: 0 }, // for od_cc type
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

accountSchema.index({ createdBy: 1, type: 1 });

module.exports = mongoose.model('Account', accountSchema);
