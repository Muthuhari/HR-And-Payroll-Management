const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { auth, authorize } = require('../middleware/auth');

router.use(auth);

router.post('/apply', leaveController.applyLeave);
router.get('/my-leaves', leaveController.getMyLeaves);
router.get('/balance', leaveController.getLeaveBalance);
router.get('/all', authorize('admin', 'hr_manager'), leaveController.getAllLeaves);
router.get('/pending', authorize('admin', 'hr_manager'), leaveController.getPendingLeaves);
router.put('/:id/approve', authorize('admin', 'hr_manager'), leaveController.approveLeave);
router.put('/:id/reject', authorize('admin', 'hr_manager'), leaveController.rejectLeave);
router.put('/:id/cancel', leaveController.cancelLeave);
router.get('/employee/:employeeId', authorize('admin', 'hr_manager'), leaveController.getEmployeeLeaves);

module.exports = router;