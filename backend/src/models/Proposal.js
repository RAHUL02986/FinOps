const mongoose = require('mongoose');

const proposalTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 100 },
  description: { type: String, maxlength: 500 },
  backgroundColor: { type: String, default: '#ffffff' },
  textColor: { type: String, default: '#1a1a1a' },
  accentColor: { type: String, default: '#6366f1' },
  headerBgColor: { type: String, default: '#6366f1' },
  headerTextColor: { type: String, default: '#ffffff' },
  fontFamily: { type: String, default: 'Inter, sans-serif' },
  watermarkText: { type: String, default: '' },
  watermarkOpacity: { type: Number, default: 0.06, min: 0, max: 1 },
  showWatermark: { type: Boolean, default: false },
  layout: { type: String, enum: ['modern', 'classic', 'minimal', 'bold'], default: 'modern' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isDefault: { type: Boolean, default: false }
}, { timestamps: true });

const proposalSectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, default: '' },
  order: { type: Number, default: 0 }
});

const proposalLineItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
  amount: { type: Number, default: 0 }
});

const proposalSchema = new mongoose.Schema({
  proposalNumber: { type: String, unique: true },
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, maxlength: 2000 },
  
  // Client info
  client: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    company: { type: String, default: '' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' }
  },
  
  // Company info
  company: {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    website: { type: String, default: '' },
    logo: { type: String, default: '' }
  },
  
  // Sections (e.g., Executive Summary, Scope of Work, Timeline, etc.)
  sections: [proposalSectionSchema],
  
  // Pricing
  items: [proposalLineItemSchema],
  subtotal: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0, min: 0, max: 100 },
  taxAmount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  
  // Template/styling
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'ProposalTemplate' },
  backgroundColor: { type: String, default: '#ffffff' },
  textColor: { type: String, default: '#1a1a1a' },
  accentColor: { type: String, default: '#6366f1' },
  headerBgColor: { type: String, default: '#6366f1' },
  headerTextColor: { type: String, default: '#ffffff' },
  watermarkText: { type: String, default: '' },
  watermarkOpacity: { type: Number, default: 0.06 },
  showWatermark: { type: Boolean, default: false },
  
  // Dates
  validUntil: { type: Date },
  issueDate: { type: Date, default: Date.now },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'],
    default: 'draft'
  },
  
  sentAt: { type: Date },
  sentTo: { type: String },
  viewedAt: { type: Date },
  respondedAt: { type: Date },
  
  notes: { type: String, maxlength: 2000 },
  terms: { type: String, maxlength: 2000 },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Auto-generate proposal number
proposalSchema.pre('validate', async function(next) {
  if (!this.proposalNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Proposal').countDocuments();
    this.proposalNumber = `PROP-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Auto-compute totals
proposalSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.items.forEach(item => {
      item.amount = item.quantity * item.unitPrice;
    });
    this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
    this.taxAmount = (this.subtotal * this.taxRate) / 100;
    this.total = this.subtotal + this.taxAmount - (this.discount || 0);
  }
  next();
});

proposalSchema.index({ createdBy: 1, status: 1 });
proposalSchema.index({ 'client.email': 1 });

const ProposalTemplate = mongoose.model('ProposalTemplate', proposalTemplateSchema);
const Proposal = mongoose.model('Proposal', proposalSchema);

module.exports = { Proposal, ProposalTemplate };
