const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    unique: true,
    required: true
  },
  personalInfo: {
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    maritalStatus: {
      type: String,
      enum: ['single', 'married', 'divorced', 'widowed']
    },
    nationality: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    },
    phone: String,
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String
    }
  },
  employmentInfo: {
    position: {
      type: String,
      required: true
    },
    department: {
      type: String,
      required: true
    },
    joiningDate: {
      type: Date,
      required: true
    },
    employmentType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'intern'],
      default: 'full-time'
    },
    workLocation: String,
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'terminated', 'on-leave'],
      default: 'active'
    },
    probationEndDate: Date,
    contractEndDate: Date
  },
  compensation: {
    baseSalary: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    payFrequency: {
      type: String,
      enum: ['monthly', 'bi-weekly', 'weekly'],
      default: 'monthly'
    },
    allowances: [{
      type: String,
      amount: Number
    }],
    deductions: [{
      type: String,
      amount: Number
    }],
    bankDetails: {
      accountName: String,
      accountNumber: String,
      bankName: String,
      branch: String,
      ifscCode: String
    }
  },
  documents: [{
    name: String,
    type: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  leaveBalance: {
    annual: { type: Number, default: 21 },
    sick: { type: Number, default: 10 },
    personal: { type: Number, default: 5 },
    maternity: { type: Number, default: 90 },
    paternity: { type: Number, default: 15 }
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

employeeSchema.virtual('fullName').get(function() {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

module.exports = mongoose.model('Employee', employeeSchema);