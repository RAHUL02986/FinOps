const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
        earnings: {
          type: [
            {
              component: { type: String, default: '' },
              amount: { type: String, default: '' },
              remarks: { type: String, default: '' }
            }
          ],
          default: []
        },
        totalHoursWorked: {
          type: Number,
          default: 0
        },
        extraLeaveDeduction: {
          type: Number,
          default: 0
        },
    facilities: {
      type: [
        {
          head: { type: String, default: '' },
          cost: { type: String, default: '' },
          remarks: { type: String, default: '' }
        }
      ],
      default: []
    },
    employeeId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      required: function() { return this.role === 'employee'; },
    },
    fatherName: {
      type: String,
      trim: true,
      default: '',
    },
    motherName: {
      type: String,
      trim: true,
      default: '',
    },
    alternateMobile: {
      type: String,
      trim: true,
      maxlength: [20, 'Alternate mobile number cannot exceed 20 characters'],
      default: '',
    },
    aadhaar: {
      type: String,
      trim: true,
      maxlength: [16, 'Aadhaar number cannot exceed 16 digits'],
      default: '',
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      trim: true,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['employee', 'dataentry', 'hr', 'manager', 'admin', 'superadmin', 'lead'],
      default: 'employee',
    },
    designation: {
      type: String,
      trim: true,
      maxlength: [50, 'Designation cannot exceed 50 characters'],
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
      default: '',
    },
    joiningDate: {
      type: Date,
      default: null,
    },
    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    department: {
      type: String,
      trim: true,
      default: '',
    },
    profileImage: {
      type: String,
      default: '', // stores local file path or filename
    },
    profileImage: {
      type: String,
      default: '', // stores local file path or filename
    },
    // Removed duplicate fields
  },
  { timestamps: true }
);

UserSchema.statics.generateEmployeeId = async function () {
  const prefix = 'CMX-EMP-';
  const latest = await this.findOne({ employeeId: { $regex: `^${prefix}\\d+$` } })
    .sort({ employeeId: -1 })
    .select('employeeId')
    .lean();

  let nextNumber = 1;
  if (latest && latest.employeeId) {
    const match = latest.employeeId.match(new RegExp(`^${prefix}(\\d+)$`));
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  const suffix = String(nextNumber).padStart(6, '0');
  return `${prefix}${suffix}`;
};

UserSchema.pre('validate', async function (next) {
  if (this.role === 'employee' && !this.employeeId) {
    this.employeeId = await this.constructor.generateEmployeeId();
  }
  next();
});

// Shared email normalization 
function normalizeUserEmail(email) {
  if (!email || typeof email !== 'string') return email;
  let normalized = email.trim().toLowerCase();
  const [local, domain] = normalized.split('@');
  if (!domain) return normalized;
  const fixedDomain = domain === 'googlemail.com' ? 'gmail.com' : domain;
  if (fixedDomain === 'gmail.com') {
    const localBeforePlus = local.split('+')[0];
    const dotless = localBeforePlus.replace(/\./g, '');
    normalized = `${dotless}@${fixedDomain}`;
  } else {
    normalized = `${local}@${fixedDomain}`;
  }
  return normalized;
}

UserSchema.pre('validate', async function (next) {
  if (this.isModified('email') && this.email) {
    this.email = normalizeUserEmail(this.email);
  }
  if (this.role === 'employee' && !this.employeeId) {
    this.employeeId = await this.constructor.generateEmployeeId();
  }
  next();
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with stored hash
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
