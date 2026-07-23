/**
 * BarberEase – Booking Validators
 * 
 * Express-validator rules for appointment booking
 * and queue entry endpoints.
 */

const { body } = require('express-validator');

// Validate appointment booking input
const bookingValidator = [
  body('service_id')
    .notEmpty().withMessage('Service is required')
    .isInt({ min: 1 }).withMessage('Invalid service ID'),

  body('chair_id')
    .notEmpty().withMessage('Chair is required')
    .isInt({ min: 1 }).withMessage('Invalid chair ID'),

  body('appointment_date')
    .notEmpty().withMessage('Appointment date is required')
    .isDate().withMessage('Please provide a valid date (YYYY-MM-DD)')
    .custom((value) => {
      const today = new Date().toISOString().split('T')[0];
      if (value < today) {
        throw new Error('Cannot book appointments in the past');
      }
      return true;
    }),

  body('time_slot')
    .trim()
    .notEmpty().withMessage('Time slot is required')
    .isLength({ min: 3, max: 20 }).withMessage('Invalid time slot format'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
];

// Validate queue entry input
const queueValidator = [
  body('service_id')
    .notEmpty().withMessage('Service is required')
    .isInt({ min: 1 }).withMessage('Invalid service ID')
];

module.exports = {
  bookingValidator,
  queueValidator
};
