const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');
const { auth, authorize } = require('../middleware/auth');

router.use(auth);

router.get('/my-payslips', payrollController.getMyPayslips);
router.get('/payslip/:id', payrollController.getPayslip);
router.post('/generate', authorize('admin', 'hr_manager'), payrollController.generatePayroll);
router.get('/all', authorize('admin', 'hr_manager'), payrollController.getAllPayrolls);
router.put('/:id', authorize('admin', 'hr_manager'), payrollController.updatePayroll);
router.put('/:id/approve', authorize('admin'), payrollController.approvePayroll);
router.get('/employee/:employeeId', authorize('admin', 'hr_manager'), payrollController.getEmployeePayrolls);
router.post('/bulk-generate', authorize('admin', 'hr_manager'), payrollController.bulkGeneratePayroll);
router.get('/download/:id', payrollController.downloadPayslip);

module.exports = router;