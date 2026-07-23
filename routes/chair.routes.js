/**
 * BarberEase – Chair Routes
 */

const express = require('express');
const router = express.Router();
const chairController = require('../controllers/chair.controller');
const authenticate = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const asyncWrapper = require('../middleware/asyncWrapper');

// Public/Customer routes (needed for real-time status and selection)
router.get('/', asyncWrapper(chairController.getAll));
router.get('/available', asyncWrapper(chairController.getAvailable));
router.get('/stats', asyncWrapper(chairController.getStats));
router.get('/:id', asyncWrapper(chairController.getById));
router.put('/:id/reserve', authenticate, roleGuard('customer'), asyncWrapper(chairController.reserve));
router.put('/:id/release', authenticate, roleGuard('customer'), asyncWrapper(chairController.release));

// Admin only routes
router.post('/', authenticate, roleGuard('super_admin', 'admin'), asyncWrapper(chairController.create));
router.put('/:id/status', authenticate, roleGuard('super_admin', 'admin'), asyncWrapper(chairController.updateStatus));

module.exports = router;
