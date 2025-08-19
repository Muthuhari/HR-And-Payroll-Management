const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  baseSalary: {
    type: Number,
    required: true
  },
  allowances: {
    type: Number,
    default: 0
  },
  deductions: [{
    name: String,
    amount: Number
  }],
  bonus: {
    type: Number,
    default: 0
  },
  overtime: {
    hours: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 }
  },
  tax: {
    type: Number,
    default: 0
  },
  netSalary: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending'
  },
  paymentDate: Date,
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cash', 'cheque'],
    default: 'bank_transfer'
  },
  payslipUrl: String,
  workingDays: Number,
  presentDays: Number,
  absentDays: Number,
  leaveDays: Number,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  notes: String,
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

payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

payrollSchema.pre('save', function(next) {
  const totalDeductions = this.deductions.reduce((sum, d) => sum + d.amount, 0);
  
  this.netSalary = this.baseSalary + this.allowances + this.bonus + this.overtime.amount - totalDeductions - this.tax;
  
  next();
});

module.exports = mongoose.model('Payroll', payrollSchema);