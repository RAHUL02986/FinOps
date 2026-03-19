const mongoose = require('mongoose');

const smtpConfigSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['system', 'invoice', 'payroll'],
    required: true,
    unique: true
  },
  host: { type: String },
  port: { type: Number, default: 587 },
  secure: { type: Boolean, default: false },
  user: { type: String },
  pass: { type: String },
  fromName: { type: String, default: '' },
  fromEmail: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('SmtpConfig', smtpConfigSchema);
