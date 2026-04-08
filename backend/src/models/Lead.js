const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    // Contact Information
    clientName: {
      type: String,
      trim: true,
      maxlength: [100, 'Client name cannot exceed 100 characters']
    },
    clientEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    clientPhone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters']
    },
    company: {
      type: String,
      trim: true,
      maxlength: [200, 'Company name cannot exceed 200 characters']
    },
    
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
    
    // Lead Priority
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium'
    },
    
    // Expected Value
    expectedValue: {
      type: Number,
      default: 0,
      min: [0, 'Expected value cannot be negative']
    },
    
    // Follow-up Date
    followUpDate: {
      type: Date
    },
    
    // Tags for categorization
    tags: [{
      type: String,
      trim: true
    }],
    
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
    enum: ['New', 'Discovery', 'Proposal Sent', 'Negotiation', 'Converted Lead', 'Closed/Lost'],
    default: 'New'
  },
  
  leadTemperature: {
    type: String,
    enum: ['Hot', 'Warm', 'Cold'],
    default: 'Warm'
  },
  
  currency: {
    type: String,
    enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'],
    default: 'USD'
  },
  
  lossReason: {
    type: String,
    enum: ['Price too high', 'Competitor chosen', 'No response', 'Budget constraints', 'Timeline mismatch', 'Technical requirements', 'Other', ''],
    default: ''
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
  
  // Notes History (instead of single note)
  notes: [{
    content: {
      type: String,
      trim: true,
      maxlength: [1000, 'Note cannot exceed 1000 characters']
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Activity Log
  activityLog: [{
    type: {
      type: String,
      enum: ['call', 'email', 'meeting', 'note', 'other'],
      required: true
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Activity description cannot exceed 500 characters']
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    performedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Comments/Discussion
  comments: [{
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    commentedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    commentedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Status Change History
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      trim: true
    }
  }]
}, {
  timestamps: true
});

// Middleware to track status changes
leadSchema.pre('save', function(next) {
  if (this.isModified('leadStatus') && this.leadStatus === 'Converted Lead' && !this.convertedAt) {
    this.convertedAt = new Date();
  }
  
  if (this.leadStatus === 'Closed/Lost' && !this.lossReason) {
    const error = new Error('Loss reason is required when lead status is Closed/Lost');
    return next(error);
  }
  
  if (this.isModified('leadStatus')) {
    this.statusHistory.push({
      status: this.leadStatus,
      changedAt: new Date()
    });
  }
  
  next();
});

// Index for efficient queries
leadSchema.index({ leadStatus: 1, createdAt: -1 });
leadSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Lead', leadSchema);
