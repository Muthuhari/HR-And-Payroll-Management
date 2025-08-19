const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

exports.generatePayroll = async (req, res) => {
  try {
    const { employeeId, month, year, bonus, allowances = 0, deductions = [] } = req.body;

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
      allowances,
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
            allowances,
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

    const doc = new PDFDocument({ margin: 50 });
    const filename = `payslip_${payroll.employee.employeeId}_${payroll.month}_${payroll.year}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    doc.pipe(res);

    // Header
    doc.fontSize(18).text('Company Name', { align: 'center' });
    doc.fontSize(22).text('PAYSLIP', { align: 'center', underline: true });
    doc.moveDown();

    // Employee & Payroll Info (two-column layout)
    doc.fontSize(12);
    doc.text(`Employee: ${payroll.employee.personalInfo.firstName} ${payroll.employee.personalInfo.lastName}`, 50, 150);
    doc.text(`Employee ID: ${payroll.employee.employeeId}`, 50, 170);
    doc.text(`Working Days: ${payroll.workingDays || '-'}`, 50, 190);
    doc.text(`Present Days: ${payroll.presentDays || '-'}`, 50, 210);

    doc.text(`Month/Year: ${payroll.month}/${payroll.year}`, 300, 150);
    doc.text(`Payment Status: ${payroll.paymentStatus}`, 300, 170);
    doc.text(`Payment Method: ${payroll.paymentMethod}`, 300, 190);
    if (payroll.paymentDate) {
      doc.text(`Payment Date: ${payroll.paymentDate.toDateString()}`, 300, 210);
    }
    doc.moveDown(3);

    // Earnings Section
    doc.fontSize(14).text('DEDUCTIONS', 50, doc.y, { underline: true })
    let y = doc.y + 5;
    doc.fontSize(12);
    doc.text('Basic Salary', 60, y);
    doc.text(`$${payroll.baseSalary}`, 400, y, { align: 'right' });

    y += 20;
    if (payroll.allowances > 0) {
      doc.text('Allowances', 60, y);
      doc.text(`$${payroll.allowances}`, 400, y, { align: 'right' });
      y += 20;
    }
    if (payroll.bonus > 0) {
      doc.text('Bonus', 60, y);
      doc.text(`$${payroll.bonus}`, 400, y, { align: 'right' });
      y += 20;
    }

    if (payroll.overtime.amount > 0) {
      doc.text(`Overtime (${payroll.overtime.hours} hrs)`, 60, y);
      doc.text(`$${payroll.overtime.amount}`, 400, y, { align: 'right' });
      y += 20;
    }

    doc.moveDown(2);

    // Deductions Section
    doc.fontSize(14).text('DEDUCTIONS', 50, doc.y, { underline: true })
    y = doc.y + 5;
    doc.fontSize(12);
    payroll.deductions.forEach(d => {
      doc.text(d.name, 60, y);
      doc.text(`$${d.amount}`, 400, y, { align: 'right' });
      y += 20;
    });

    doc.text('Tax', 60, y);
    doc.text(`$${payroll.tax}`, 400, y, { align: 'right' });

    doc.moveDown(3);

    // Net Salary (highlighted)
    doc.fontSize(14).text('NET SALARY', 50, doc.y, { underline: true })
    y = doc.y + 5;
    doc.fontSize(12);
    doc.text('Take Home Pay', 60, y);
    doc.text(`$${payroll.netSalary}`, 400, y, { align: 'right' });

    doc.moveDown(2);

    // Footer
    doc.fontSize(12);
    doc.text(`Approved By: ${payroll.approvedBy?.personalInfo?.firstName || ''} ${payroll.approvedBy?.personalInfo?.lastName || ''}`, 50, doc.y + 40);
    if (payroll.notes) {
      doc.text(`Notes: ${payroll.notes}`, 50, doc.y + 20);
    }

    doc.text('--- End of Payslip ---', { align: 'center', baseline: 'bottom' });

    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
