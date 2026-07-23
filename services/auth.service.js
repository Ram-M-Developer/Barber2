/**
 * BarberEase – Auth Service
 * 
 * Business logic for authentication:
 *   - Customer registration
 *   - Customer login
 *   - Admin login
 *   - Password hashing and verification
 *   - JWT token generation
 *   - Password reset
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/app');
const { Customer, Admin } = require('../models');

/**
 * Register a new customer account.
 * Hashes password, creates record, returns JWT.
 */
async function registerCustomer(data) {
  // Check for existing email
  const existing = await Customer.scope('withPassword').findOne({
    where: { email: data.email }
  });

  if (existing) {
    const error = new Error('Email already registered');
    error.statusCode = 409;
    throw error;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, config.bcrypt.saltRounds);

  // Create customer
  const customer = await Customer.create({
    name: data.name,
    email: data.email,
    phone: data.phone,
    password: hashedPassword,
    address: data.address || null,
    gender: data.gender || null
  });

  // Generate JWT
  const token = generateJWT({
    id: customer.id,
    email: customer.email,
    role: 'customer',
    type: 'customer'
  });

  // Return customer without password
  const customerData = await Customer.findByPk(customer.id);

  return { customer: customerData, token };
}

/**
 * Authenticate a customer with email and password.
 */
async function loginCustomer(email, password) {
  // Find customer with password included
  const customer = await Customer.scope('withPassword').findOne({
    where: { email }
  });

  if (!customer) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  if (!customer.is_active) {
    const error = new Error('Account is deactivated. Contact support.');
    error.statusCode = 403;
    throw error;
  }

  // Compare password
  const isMatch = await bcrypt.compare(password, customer.password);

  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Update last login
  await customer.update({ last_login: new Date() });

  // Generate JWT
  const token = generateJWT({
    id: customer.id,
    email: customer.email,
    role: 'customer',
    type: 'customer'
  });

  // Return customer without password
  const customerData = await Customer.findByPk(customer.id);

  return { customer: customerData, token };
}

/**
 * Authenticate an admin with username and password.
 */
async function loginAdmin(username, password) {
  const admin = await Admin.scope('withPassword').findOne({
    where: { username }
  });

  if (!admin) {
    const error = new Error('Invalid username or password');
    error.statusCode = 401;
    throw error;
  }

  if (!admin.is_active) {
    const error = new Error('Admin account is deactivated.');
    error.statusCode = 403;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, admin.password);

  if (!isMatch) {
    const error = new Error('Invalid username or password');
    error.statusCode = 401;
    throw error;
  }

  // Update last login
  await admin.update({ last_login: new Date() });

  const token = generateJWT({
    id: admin.id,
    email: admin.email,
    role: admin.role,
    type: 'admin'
  });

  const adminData = await Admin.findByPk(admin.id);

  return { admin: adminData, token };
}

/**
 * Reset customer password (simplified — no email verification).
 * In production, implement email-based token verification.
 */
async function resetPassword(email, newPassword) {
  const customer = await Customer.scope('withPassword').findOne({
    where: { email }
  });

  if (!customer) {
    const error = new Error('No account found with this email');
    error.statusCode = 404;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);
  await customer.update({ password: hashedPassword });

  return { message: 'Password reset successfully' };
}

/**
 * Generate a JWT token from the user payload.
 */
function generateJWT(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
}

module.exports = {
  registerCustomer,
  loginCustomer,
  loginAdmin,
  resetPassword
};
