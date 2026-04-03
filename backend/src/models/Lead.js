const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    // Milestones for converted leads
    milestones: [
      {
        name: { type: String, required: true },
        amount: { type: Number, required: true },
        dueDate: { type: Date },
        status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' }
      }
    ],
    // Financial fields for converted leads
    productValue: { type: Number, default: 0 },
    platformFees: { type: Number, default: 0 },
    finalValue: { type: Number, default: 0 },
  leadSource: {
    type: String,
    required: [true, 'Lead source is required'],
    enum: [
      'LinkedIn',
      'Upwork',
      'Fiverr',
      'Freelancer',
      'Referral',
      'Website',
      'Email',
      'Social Media',
      'Other'
    ]
  },
  projectDescription: {
    type: String,
    required: [true, 'Project description is required'],
    trim: true,
    minlength: [10, 'Project description must be at least 10 characters'],
    maxlength: [2000, 'Project description cannot exceed 2000 characters']
  },
  technologyStack: {
    type: String,
    required: [true, 'Technology stack is required'],
    enum: [
      'MERN Stack (MongoDB, Express, React, Node.js)',
      'MEAN Stack (MongoDB, Express, Angular, Node.js)',
      'Full Stack JavaScript',
      'Python Django',
      'Python Flask',
      'PHP Laravel',
      'Ruby on Rails',
      'Java Spring Boot',
      '.NET Core',
      'Vue.js + Node.js',
      'Next.js + Node.js',
      'React Native',
      'Flutter',
      'iOS Native',
      'Android Native',
      'WordPress',
      'Shopify',
      'Other'
    ]
  },
  leadStatus: {
    type: String,
    required: [true, 'Lead status is required'],
    enum: ['Lead', 'Pending Lead', 'Converted Lead'],
    default: 'Lead'
  },
  convertedAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: false
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  attachments: [
    {
      url: { type: String, required: true },
      type: { type: String, enum: ['image', 'pdf', 'video', 'other'], required: true },
      name: { type: String },
      uploadedAt: { type: Date, default: Date.now }
    }
  ],
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true
});

// Middleware to set convertedAt date when status changes to 'Converted Lead'
leadSchema.pre('save', function(next) {
  if (this.isModified('leadStatus') && this.leadStatus === 'Converted Lead' && !this.convertedAt) {
    this.convertedAt = new Date();
  }
  next();
});

// Index for efficient queries
leadSchema.index({ leadStatus: 1, createdAt: -1 });
leadSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Lead', leadSchema);
