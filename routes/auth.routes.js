/**
 * BarberEase – Authentication Routes
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth');
const asyncWrapper = require('../middleware/asyncWrapper');
const validate = require('../validators/validate');
const {
  registerValidator,
  loginValidator,
  adminLoginValidator,
  forgotPasswordValidator,
  resetPasswordValidator
} = require('../validators/auth.validator');

// Customer registration
router.post('/register', registerValidator, validate, asyncWrapper(authController.register));

// Customer login
router.post('/login', loginValidator, validate, asyncWrapper(authController.login));

// Admin login
router.post('/admin/login', adminLoginValidator, validate, asyncWrapper(authController.adminLogin));

// Forgot password
router.post('/forgot-password', forgotPasswordValidator, validate, asyncWrapper(authController.forgotPassword));

// Reset password
router.post('/reset-password', resetPasswordValidator, validate, asyncWrapper(authController.resetPassword));

// Get current user (token validation check)
router.get('/me', authenticate, asyncWrapper(authController.getMe));

module.exports = router;
