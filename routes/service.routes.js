/**
 * BarberEase – Service Routes
 */

const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');
const authenticate = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const asyncWrapper = require('../middleware/asyncWrapper');

// Public routes (anyone can see active services)
router.get('/', asyncWrapper(serviceController.getAll));
router.get('/:id', asyncWrapper(serviceController.getById));

// Admin only routes (service CRUD)
router.get('/admin/all', authenticate, roleGuard('super_admin', 'admin'), asyncWrapper(serviceController.getAllAdmin));
router.post('/', authenticate, roleGuard('super_admin', 'admin'), asyncWrapper(serviceController.create));
router.put('/:id', authenticate, roleGuard('super_admin', 'admin'), asyncWrapper(serviceController.update));
router.delete('/:id', authenticate, roleGuard('super_admin', 'admin'), asyncWrapper(serviceController.remove));

module.exports = router;
