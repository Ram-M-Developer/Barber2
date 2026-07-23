/**
 * BarberEase – Queue Routes
 */

const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queue.controller');
const authenticate = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const asyncWrapper = require('../middleware/asyncWrapper');
const validate = require('../validators/validate');
const { queueValidator } = require('../validators/booking.validator');

// Customer routes
router.post('/join', authenticate, roleGuard('customer'), queueValidator, validate, asyncWrapper(queueController.joinQueue));
router.get('/my-status', authenticate, roleGuard('customer'), asyncWrapper(queueController.getMyStatus));

// Shared cancel queue entry (both Customer and Admin can cancel)
router.put('/:id/cancel', authenticate, roleGuard('super_admin', 'admin', 'customer'), asyncWrapper(queueController.cancel));

// Public/Shared dashboard queue info
router.get('/', asyncWrapper(queueController.getActiveQueue));
router.get('/stats', asyncWrapper(queueController.getStats));

// Admin only routes
router.post('/call-next', authenticate, roleGuard('super_admin', 'admin'), asyncWrapper(queueController.callNext));

module.exports = router;
