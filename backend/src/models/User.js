const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
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
      enum: ['dataentry', 'hr', 'manager', 'admin', 'superadmin'],
      default: 'dataentry',
    },
    designation: {
      type: String,
      trim: true,
      maxlength: [50, 'Designation cannot exceed 50 characters'],
      default: '',
    },
    sector: {
      type: String,
      enum: ['IT', 'HR', 'Finance', 'Sales', 'Marketing', 'Operations', 'Admin'],
      default: 'IT',
    },
    employmentType: {
      type: String,
      enum: ['full-time', 'part-time'],
      default: 'full-time',
    },
    joiningDate: {
      type: Date,
    },
    experienceYears: {
      type: Number,
      min: 0,
      default: 0,
    },
    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    isActive: {
      type: Boolean,
      default: true,
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
