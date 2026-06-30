const mongoose = require('mongoose');

const salarySlipSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employeeName: { type: String, required: true },
  employeeEmail: { type: String, required: true },
  employeeId: { type: String, default: '' },
  designation: { type: String, default: '' },
  department: { type: String, default: '' },
  workLocation: { type: String, default: '' },
  fatherName: { type: String, default: '' },
  motherName: { type: String, default: '' },
  month: { type: Number, required: true, min: 1, max: 12 },
  monthName: { type: String, default: '' },
  year: { type: Number, required: true },

  // Company Info
  companyName: { type: String, default: 'CodexMatrix Pvt. Ltd.' },
  companyAddress: { type: String, default: 'Dharamshala, Himachal Pradesh, India' },
  companyEmail: { type: String, default: 'hr@codexmatrix.com' },
  companyWebsite: { type: String, default: 'www.codexmatrix.com' },

  // Dynamic arrays for tables
  earnings: [
    {
      component: String,
      amount: String,
      remarks: String
    }
  ],
  extraDeductions: [
    {
      component: String,
      amount: String,
      remarks: String
    }
  ],
  facilities: [
    {
      head: String,
      cost: String,
      remarks: String
    }
  ],
  totalValue: [
    {
      component: String,
      amount: String,
      remarks: String
    }
  ],


  // Payment and authorization
  paymentDetails: { type: String, default: '' },
  authorizedBy: { type: String, default: '' },

  // Reason for salary change (Joining, Increment, Promotion, Other)
  reason: { type: String, default: '' },

  // Notes
  notes1: { type: String, default: '' },
  notes2: { type: String, default: '' },

  // Legacy fields for compatibility (optional)
  basicSalary: { type: Number, default: 0 },
  hra: { type: Number, default: 0 },
  allowances: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  netSalary: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },

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
