/**
 * BarberEase – Auth Controller
 * 
 * Handles HTTP requests for authentication endpoints.
 * Delegates business logic to auth.service.js.
 */

const authService = require('../services/auth.service');

/** POST /api/auth/register */
async function register(req, res) {
  const result = await authService.registerCustomer(req.body);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: result
  });
}

/** POST /api/auth/login */
async function login(req, res) {
  const { email, password } = req.body;
  const result = await authService.loginCustomer(email, password);

  res.json({
    success: true,
    message: 'Login successful',
    data: result
  });
}

/** POST /api/auth/admin/login */
async function adminLogin(req, res) {
  const { username, password } = req.body;
  const result = await authService.loginAdmin(username, password);

  res.json({
    success: true,
    message: 'Admin login successful',
    data: result
  });
}

/** POST /api/auth/forgot-password */
async function forgotPassword(req, res) {
  const { email } = req.body;
  // In production, this would send a reset email.
  // For this project, we return a message.
  res.json({
    success: true,
    message: 'If an account with this email exists, a password reset link has been sent.'
  });
}

/** POST /api/auth/reset-password */
async function resetPassword(req, res) {
  const { email, newPassword } = req.body;
  const result = await authService.resetPassword(email, newPassword);

  res.json({
    success: true,
    message: result.message
  });
}

/** GET /api/auth/me */
async function getMe(req, res) {
  res.json({
    success: true,
    data: req.user
  });
}

module.exports = {
  register,
  login,
  adminLogin,
  forgotPassword,
  resetPassword,
  getMe
};
