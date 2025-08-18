const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const moment = require('moment');

exports.clockIn = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const today = moment().startOf('day');
    
    const existingAttendance = await Attendance.findOne({
      employee: employee._id,
      date: { $gte: today.toDate(), $lt: moment(today).endOf('day').toDate() }
    });

    if (existingAttendance && existingAttendance.clockIn) {
      return res.status(400).json({ error: 'Already clocked in today' });
    }

    const attendance = existingAttendance || new Attendance({
      employee: employee._id,
      date: new Date()
    });

    attendance.clockIn = new Date();
    attendance.status = 'present';
    attendance.workType = req.body.workType || 'office';
    
    await attendance.save();

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.clockOut = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const today = moment().startOf('day');
    
    const attendance = await Attendance.findOne({
      employee: employee._id,
      date: { $gte: today.toDate(), $lt: moment(today).endOf('day').toDate() }
    });

    if (!attendance || !attendance.clockIn) {
      return res.status(400).json({ error: 'No clock in found for today' });
    }

    if (attendance.clockOut) {
      return res.status(400).json({ error: 'Already clocked out today' });
    }

    attendance.clockOut = new Date();
    attendance.breakTime = req.body.breakTime || 60;
    
    const totalHours = (attendance.clockOut - attendance.clockIn) / (1000 * 60 * 60);
    const workingHours = totalHours - (attendance.breakTime / 60);
    
    if (workingHours > 8) {
      attendance.overtime = workingHours - 8;
    }
    
    await attendance.save();

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMyAttendance = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const { startDate, endDate } = req.query;
    
    let query = { employee: employee._id };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query).sort({ date: -1 });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllAttendance = async (req, res) => {
  try {
    const { startDate, endDate, employeeId, department } = req.query;
    
    let query = {};
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (employeeId) {
      query.employee = employeeId;
    }

    const attendance = await Attendance.find(query)
      .populate('employee', 'personalInfo employmentInfo.department')
      .sort({ date: -1 });

    let filteredAttendance = attendance;
    
    if (department) {
      filteredAttendance = attendance.filter(a => 
        a.employee?.employmentInfo?.department === department
      );
    }

    res.json(filteredAttendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getEmployeeAttendance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = { employee: req.params.employeeId };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query)
      .populate('employee', 'personalInfo')
      .sort({ date: -1 });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.markAttendance = async (req, res) => {
  try {
    const { employeeId, date, status, clockIn, clockOut, notes } = req.body;

    const existingAttendance = await Attendance.findOne({
      employee: employeeId,
      date: moment(date).startOf('day').toDate()
    });

    if (existingAttendance) {
      return res.status(400).json({ error: 'Attendance already marked for this date' });
    }

    const attendance = new Attendance({
      employee: employeeId,
      date: new Date(date),
      status,
      clockIn: clockIn ? new Date(clockIn) : null,
      clockOut: clockOut ? new Date(clockOut) : null,
      notes,
      approvedBy: req.user.employee
    });

    await attendance.save();

    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      { ...req.body, approvedBy: req.user.employee },
      { new: true }
    );

    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAttendanceReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    const startDate = moment().year(year).month(month - 1).startOf('month');
    const endDate = moment().year(year).month(month - 1).endOf('month');

    const attendance = await Attendance.find({
      date: {
        $gte: startDate.toDate(),
        $lte: endDate.toDate()
      }
    }).populate('employee', 'personalInfo employmentInfo');

    const report = {};
    
    attendance.forEach(record => {
      const employeeId = record.employee._id.toString();
      
      if (!report[employeeId]) {
        report[employeeId] = {
          employee: record.employee,
          present: 0,
          absent: 0,
          halfDay: 0,
          onLeave: 0,
          totalHours: 0,
          overtime: 0
        };
      }
      
      report[employeeId][record.status]++;
      report[employeeId].totalHours += record.totalHours || 0;
      report[employeeId].overtime += record.overtime || 0;
    });

    res.json(Object.values(report));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};