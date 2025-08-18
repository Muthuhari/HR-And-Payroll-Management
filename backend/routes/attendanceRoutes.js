const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { auth, authorize } = require('../middleware/auth');

router.use(auth);

router.post('/clock-in', attendanceController.clockIn);
router.post('/clock-out', attendanceController.clockOut);
router.get('/my-attendance', attendanceController.getMyAttendance);
router.get('/all', authorize('admin', 'hr_manager'), attendanceController.getAllAttendance);
router.get('/employee/:employeeId', authorize('admin', 'hr_manager'), attendanceController.getEmployeeAttendance);
router.post('/mark', authorize('admin', 'hr_manager'), attendanceController.markAttendance);
router.put('/:id', authorize('admin', 'hr_manager'), attendanceController.updateAttendance);
router.get('/report', authorize('admin', 'hr_manager'), attendanceController.getAttendanceReport);

module.exports = router;