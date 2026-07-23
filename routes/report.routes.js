/**
 * BarberEase – Report Routes
 */

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const authenticate = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const asyncWrapper = require('../middleware/asyncWrapper');

// Admin only routes for reports
router.get('/dashboard-stats', authenticate, roleGuard('super_admin', 'admin'), asyncWrapper(reportController.getStats));
router.get('/daily', authenticate, roleGuard('super_admin', 'admin'), asyncWrapper(reportController.getDaily));
router.get('/monthly', authenticate, roleGuard('super_admin', 'admin'), asyncWrapper(reportController.getMonthly));
router.get('/chairs', authenticate, roleGuard('super_admin', 'admin'), asyncWrapper(reportController.getChairsReport));
router.get('/customers/:id/history', authenticate, roleGuard('super_admin', 'admin'), asyncWrapper(reportController.getCustomerHistory));
router.get('/peak-hours', authenticate, roleGuard('super_admin', 'admin'), asyncWrapper(reportController.getPeakHours));
router.get('/services', authenticate, roleGuard('super_admin', 'admin'), asyncWrapper(reportController.getServicesReport));

module.exports = router;
