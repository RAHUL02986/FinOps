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
