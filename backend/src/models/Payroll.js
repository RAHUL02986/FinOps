const mongoose = require('mongoose');

const salarySlipSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employeeName: { type: String, required: true },
  employeeEmail: { type: String, required: true },
  designation: { type: String, default: '' },
  basicSalary: { type: Number, required: true },
  hra: { type: Number, default: 0 },
  allowances: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  netSalary: { type: Number, required: true },
  bonus: { type: Number, default: 0 },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  status: {
    type: String,
    enum: ['draft', 'processing', 'completed', 'sent'],
    default: 'draft'
  },
  sentAt: { type: Date },
  payrollRun: { type: mongoose.Schema.Types.ObjectId, ref: 'PayrollRun' }
}, { timestamps: true });

const payrollRunSchema = new mongoose.Schema({
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  status: {
    type: String,
    enum: ['draft', 'processing', 'completed'],
    default: 'draft'
  },
  totalAmount: { type: Number, default: 0 },
  employeeCount: { type: Number, default: 0 },
  slips: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SalarySlip' }],
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  completedAt: { type: Date }
}, { timestamps: true });

payrollRunSchema.index({ month: 1, year: 1 }, { unique: true });
salarySlipSchema.index({ employee: 1, month: 1, year: 1 });

const SalarySlip = mongoose.model('SalarySlip', salarySlipSchema);
const PayrollRun = mongoose.model('PayrollRun', payrollRunSchema);

module.exports = { SalarySlip, PayrollRun };
