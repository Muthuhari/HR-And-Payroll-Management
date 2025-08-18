const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const Notification = require('../models/Notification');

exports.applyLeave = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const { leaveType, startDate, endDate, reason } = req.body;

    const leave = new Leave({
      employee: employee._id,
      leaveType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason
    });

    await leave.save();

    const managers = await Employee.find({
      'employmentInfo.department': employee.employmentInfo.department,
      user: { $ne: null }
    }).populate('user');

    const hrManagers = managers.filter(m => 
      m.user && (m.user.role === 'hr_manager' || m.user.role === 'admin')
    );

    for (const manager of hrManagers) {
      await new Notification({
        recipient: manager._id,
        sender: employee._id,
        type: 'leave_request',
        title: 'New Leave Request',
        message: `${employee.personalInfo.firstName} ${employee.personalInfo.lastName} has applied for ${leaveType} leave`,
        relatedTo: {
          model: 'Leave',
          id: leave._id
        }
      }).save();
    }

    res.status(201).json(leave);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMyLeaves = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const leaves = await Leave.find({ employee: employee._id })
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLeaveBalance = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const currentYear = new Date().getFullYear();
    
    const approvedLeaves = await Leave.find({
      employee: employee._id,
      status: 'approved',
      startDate: {
        $gte: new Date(currentYear, 0, 1),
        $lte: new Date(currentYear, 11, 31)
      }
    });

    const leavesTaken = {
      annual: 0,
      sick: 0,
      personal: 0,
      maternity: 0,
      paternity: 0
    };

    approvedLeaves.forEach(leave => {
      const days = leave.numberOfDays;
      leavesTaken[leave.leaveType] += days;
    });

    const balance = {
      annual: employee.leaveBalance.annual - leavesTaken.annual,
      sick: employee.leaveBalance.sick - leavesTaken.sick,
      personal: employee.leaveBalance.personal - leavesTaken.personal,
      maternity: employee.leaveBalance.maternity - leavesTaken.maternity,
      paternity: employee.leaveBalance.paternity - leavesTaken.paternity
    };

    res.json({
      balance,
      taken: leavesTaken,
      total: employee.leaveBalance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllLeaves = async (req, res) => {
  try {
    const { status, employeeId, department } = req.query;
    
    let query = {};
    
    if (status) query.status = status;
    if (employeeId) query.employee = employeeId;

    const leaves = await Leave.find(query)
      .populate('employee', 'personalInfo employmentInfo')
      .populate('approvedBy', 'personalInfo')
      .sort({ createdAt: -1 });

    let filteredLeaves = leaves;
    
    if (department) {
      filteredLeaves = leaves.filter(l => 
        l.employee?.employmentInfo?.department === department
      );
    }

    res.json(filteredLeaves);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPendingLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ status: 'pending' })
      .populate('employee', 'personalInfo employmentInfo')
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.approveLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate('employee', 'personalInfo');

    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ error: 'Leave request already processed' });
    }

    const approver = await Employee.findOne({ user: req.user._id });

    leave.status = 'approved';
    leave.approvedBy = approver._id;
    leave.approvalDate = new Date();
    leave.comments = req.body.comments;
    
    await leave.save();

    await new Notification({
      recipient: leave.employee._id,
      sender: approver._id,
      type: 'leave_approved',
      title: 'Leave Request Approved',
      message: `Your ${leave.leaveType} leave request has been approved`,
      relatedTo: {
        model: 'Leave',
        id: leave._id
      }
    }).save();

    res.json(leave);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.rejectLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate('employee', 'personalInfo');

    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ error: 'Leave request already processed' });
    }

    const approver = await Employee.findOne({ user: req.user._id });

    leave.status = 'rejected';
    leave.approvedBy = approver._id;
    leave.approvalDate = new Date();
    leave.comments = req.body.comments || req.body.reason;
    
    await leave.save();

    await new Notification({
      recipient: leave.employee._id,
      sender: approver._id,
      type: 'leave_rejected',
      title: 'Leave Request Rejected',
      message: `Your ${leave.leaveType} leave request has been rejected`,
      relatedTo: {
        model: 'Leave',
        id: leave._id
      }
    }).save();

    res.json(leave);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.cancelLeave = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    
    const leave = await Leave.findOne({
      _id: req.params.id,
      employee: employee._id
    });

    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (leave.status === 'cancelled') {
      return res.status(400).json({ error: 'Leave request already cancelled' });
    }

    leave.status = 'cancelled';
    await leave.save();

    res.json(leave);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getEmployeeLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ employee: req.params.employeeId })
      .populate('approvedBy', 'personalInfo')
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};