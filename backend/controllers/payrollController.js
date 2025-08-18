const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

exports.generatePayroll = async (req, res) => {
  try {
    const { employeeId, month, year, bonus = 0, deductions = [] } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const existingPayroll = await Payroll.findOne({
      employee: employeeId,
      month,
      year
    });

    if (existingPayroll) {
      return res.status(400).json({ error: 'Payroll already exists for this period' });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendance = await Attendance.find({
      employee: employeeId,
      date: { $gte: startDate, $lte: endDate }
    });

    const workingDays = endDate.getDate();
    const presentDays = attendance.filter(a => a.status === 'present').length;
    const absentDays = attendance.filter(a => a.status === 'absent').length;
    const leaveDays = attendance.filter(a => a.status === 'on-leave').length;
    
    const totalOvertime = attendance.reduce((sum, a) => sum + (a.overtime || 0), 0);
    const overtimeRate = employee.compensation.baseSalary / (workingDays * 8) * 1.5;
    const overtimeAmount = totalOvertime * overtimeRate;

    const payroll = new Payroll({
      employee: employeeId,
      month,
      year,
      baseSalary: employee.compensation.baseSalary,
      allowances: employee.compensation.allowances || [],
      deductions: [...(employee.compensation.deductions || []), ...deductions],
      bonus,
      overtime: {
        hours: totalOvertime,
        rate: overtimeRate,
        amount: overtimeAmount
      },
      workingDays,
      presentDays,
      absentDays,
      leaveDays,
      tax: employee.compensation.baseSalary * 0.1,
      approvedBy: req.user.employee
    });

    await payroll.save();

    await new Notification({
      recipient: employee._id,
      type: 'payslip',
      title: 'Payslip Generated',
      message: `Your payslip for ${month}/${year} has been generated`,
      relatedTo: {
        model: 'Payroll',
        id: payroll._id
      }
    }).save();

    res.status(201).json(payroll);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.bulkGeneratePayroll = async (req, res) => {
  try {
    const { month, year } = req.body;

    const employees = await Employee.find({ 'employmentInfo.status': 'active' });
    const results = [];

    for (const employee of employees) {
      try {
        const existingPayroll = await Payroll.findOne({
          employee: employee._id,
          month,
          year
        });

        if (!existingPayroll) {
          const startDate = new Date(year, month - 1, 1);
          const endDate = new Date(year, month, 0);

          const attendance = await Attendance.find({
            employee: employee._id,
            date: { $gte: startDate, $lte: endDate }
          });

          const workingDays = endDate.getDate();
          const presentDays = attendance.filter(a => a.status === 'present').length;
          const absentDays = attendance.filter(a => a.status === 'absent').length;
          const leaveDays = attendance.filter(a => a.status === 'on-leave').length;

          const payroll = new Payroll({
            employee: employee._id,
            month,
            year,
            baseSalary: employee.compensation.baseSalary,
            allowances: employee.compensation.allowances || [],
            deductions: employee.compensation.deductions || [],
            workingDays,
            presentDays,
            absentDays,
            leaveDays,
            tax: employee.compensation.baseSalary * 0.1,
            approvedBy: req.user.employee
          });

          await payroll.save();
          results.push({ employee: employee.employeeId, status: 'success' });

          await new Notification({
            recipient: employee._id,
            type: 'payslip',
            title: 'Payslip Generated',
            message: `Your payslip for ${month}/${year} has been generated`,
            relatedTo: {
              model: 'Payroll',
              id: payroll._id
            }
          }).save();
        } else {
          results.push({ employee: employee.employeeId, status: 'already_exists' });
        }
      } catch (err) {
        results.push({ employee: employee.employeeId, status: 'error', error: err.message });
      }
    }

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMyPayslips = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const payrolls = await Payroll.find({ employee: employee._id })
      .sort({ year: -1, month: -1 });

    res.json(payrolls);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPayslip = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('employee')
      .populate('approvedBy', 'personalInfo');

    if (!payroll) {
      return res.status(404).json({ error: 'Payslip not found' });
    }

    const employee = await Employee.findOne({ user: req.user._id });
    
    if (req.user.role === 'employee' && 
        payroll.employee._id.toString() !== employee._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(payroll);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllPayrolls = async (req, res) => {
  try {
    const { month, year, department, status } = req.query;
    
    let query = {};
    
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    if (status) query.paymentStatus = status;

    const payrolls = await Payroll.find(query)
      .populate('employee', 'personalInfo employmentInfo employeeId')
      .sort({ year: -1, month: -1 });

    let filteredPayrolls = payrolls;
    
    if (department) {
      filteredPayrolls = payrolls.filter(p => 
        p.employee?.employmentInfo?.department === department
      );
    }

    res.json(filteredPayrolls);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updatePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!payroll) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    res.json(payroll);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.approvePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);

    if (!payroll) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    payroll.paymentStatus = 'paid';
    payroll.paymentDate = new Date();
    payroll.paymentMethod = req.body.paymentMethod || 'bank_transfer';
    
    await payroll.save();

    res.json(payroll);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getEmployeePayrolls = async (req, res) => {
  try {
    const payrolls = await Payroll.find({ employee: req.params.employeeId })
      .sort({ year: -1, month: -1 });

    res.json(payrolls);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.downloadPayslip = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('employee')
      .populate('approvedBy', 'personalInfo');

    if (!payroll) {
      return res.status(404).json({ error: 'Payslip not found' });
    }

    const doc = new PDFDocument();
    const filename = `payslip_${payroll.employee.employeeId}_${payroll.month}_${payroll.year}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    doc.pipe(res);

    doc.fontSize(20).text('PAYSLIP', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text(`Employee: ${payroll.employee.personalInfo.firstName} ${payroll.employee.personalInfo.lastName}`);
    doc.text(`Employee ID: ${payroll.employee.employeeId}`);
    doc.text(`Month/Year: ${payroll.month}/${payroll.year}`);
    doc.moveDown();
    
    doc.text('EARNINGS', { underline: true });
    doc.text(`Basic Salary: $${payroll.baseSalary}`);
    
    if (payroll.allowances.length > 0) {
      payroll.allowances.forEach(a => {
        doc.text(`${a.name}: $${a.amount}`);
      });
    }
    
    if (payroll.bonus > 0) {
      doc.text(`Bonus: $${payroll.bonus}`);
    }
    
    if (payroll.overtime.amount > 0) {
      doc.text(`Overtime (${payroll.overtime.hours} hrs): $${payroll.overtime.amount}`);
    }
    
    doc.moveDown();
    doc.text('DEDUCTIONS', { underline: true });
    
    if (payroll.deductions.length > 0) {
      payroll.deductions.forEach(d => {
        doc.text(`${d.name}: $${d.amount}`);
      });
    }
    
    doc.text(`Tax: $${payroll.tax}`);
    
    doc.moveDown();
    doc.fontSize(14).text(`NET SALARY: $${payroll.netSalary}`, { underline: true });
    
    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};