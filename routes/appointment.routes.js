/**
 * BarberEase – Appointment Routes
 */

const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointment.controller');
const authenticate = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const asyncWrapper = require('../middleware/asyncWrapper');
const validate = require('../validators/validate');
const { bookingValidator } = require('../validators/booking.validator');

// Customer routes
router.post('/', authenticate, roleGuard('customer'), bookingValidator, validate, asyncWrapper(appointmentController.create));
router.get('/my', authenticate, roleGuard('customer'), asyncWrapper(appointmentController.getMyAppointments));

// Shared cancel route (both Customer and Admin can cancel)
router.put('/:id/cancel', authenticate, roleGuard('super_admin', 'admin', 'customer'), asyncWrapper(appointmentController.cancel));

// Admin only routes
router.get('/', authenticate, roleGuard('super_admin', 'admin'), asyncWrapper(appointmentController.getAll));
router.get('/today', authenticate, roleGuard('super_admin', 'admin'), asyncWrapper(appointmentController.getToday));
router.get('/:id', authenticate, roleGuard('super_admin', 'admin'), asyncWrapper(appointmentController.getById));
router.put('/:id/complete', authenticate, roleGuard('super_admin', 'admin'), asyncWrapper(appointmentController.complete));
router.put('/:id/start', authenticate, roleGuard('super_admin', 'admin'), asyncWrapper(appointmentController.start));

module.exports = router;
