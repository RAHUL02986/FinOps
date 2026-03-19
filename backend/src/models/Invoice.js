const mongoose = require('mongoose');

const LineItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true, maxlength: 300 },
    quantity:    { type: Number, required: true, min: 0 },
    unitPrice:   { type: Number, required: true, min: 0 },
    amount:      { type: Number, required: true, min: 0 }, // quantity * unitPrice
  },
  { _id: false }
);

const InvoiceSchema = new mongoose.Schema(
  {
    // Auto-generated invoice number: INV-YYYY-NNNN
    invoiceNumber: { type: String, unique: true, trim: true },

    // Who created this invoice
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Client details (stored inline, not a separate model)
    client: {
      name:    { type: String, required: true, trim: true, maxlength: 200 },
      email:   { type: String, required: true, trim: true, lowercase: true },
      company: { type: String, trim: true, maxlength: 200, default: '' },
      address: { type: String, trim: true, maxlength: 500, default: '' },
      phone:   { type: String, trim: true, maxlength: 50, default: '' },
    },

    // Company / sender details (overrideable per invoice, defaults to env)
    company: {
      name:    { type: String, trim: true, default: 'Your Company' },
      email:   { type: String, trim: true, default: '' },
      address: { type: String, trim: true, default: '' },
      phone:   { type: String, trim: true, default: '' },
      website: { type: String, trim: true, default: '' },
      logo:    { type: String, trim: true, default: '' }, // URL of company logo
    },

    // Line items
    items: { type: [LineItemSchema], default: [] },

    // Totals
    subtotal:  { type: Number, default: 0 },
    taxRate:   { type: Number, default: 0, min: 0, max: 100 }, // percent
    taxAmount: { type: Number, default: 0 },
    discount:  { type: Number, default: 0 }, // flat amount
    total:     { type: Number, default: 0 },

    currency: { type: String, default: 'USD', maxlength: 10 },

    // Dates
    issueDate: { type: Date, default: Date.now },
    dueDate:   { type: Date },

    // Status
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
      default: 'draft',
    },

    notes:      { type: String, trim: true, maxlength: 1000, default: '' },
    terms:      { type: String, trim: true, maxlength: 1000, default: '' },

    // Track when the invoice was emailed
    sentAt:     { type: Date },
    sentTo:     { type: String, trim: true }, // email it was sent to
  },
  { timestamps: true }
);

// Auto-generate invoice number before saving
InvoiceSchema.pre('validate', async function (next) {
  if (!this.invoiceNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Invoice').countDocuments();
    this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Recompute totals before saving
InvoiceSchema.pre('save', function (next) {
  this.subtotal = this.items.reduce((s, item) => s + (item.amount || 0), 0);
  this.taxAmount = Math.round(((this.subtotal * this.taxRate) / 100) * 100) / 100;
  this.total = Math.max(0, this.subtotal + this.taxAmount - (this.discount || 0));
  next();
});

InvoiceSchema.index({ createdBy: 1, status: 1 });
InvoiceSchema.index({ 'client.email': 1 });

module.exports = mongoose.model('Invoice', InvoiceSchema);
