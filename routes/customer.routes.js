/**
 * BarberEase – Customer Routes
 */

const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const authenticate = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const asyncWrapper = require('../middleware/asyncWrapper');

// Protected customer routes
router.get('/profile', authenticate, roleGuard('customer'), asyncWrapper(customerController.getProfile));
router.put('/profile', authenticate, roleGuard('customer'), asyncWrapper(customerController.updateProfile));
router.put('/profile/password', authenticate, roleGuard('customer'), asyncWrapper(customerController.changePassword));
router.put('/profile/wallet', authenticate, roleGuard('customer'), asyncWrapper(customerController.topUp));

// Admin only routes
router.get('/', authenticate, roleGuard('super_admin', 'admin'), asyncWrapper(customerController.getAll));
router.put('/:id/toggle', authenticate, roleGuard('super_admin', 'admin'), asyncWrapper(customerController.toggleStatus));

module.exports = router;
