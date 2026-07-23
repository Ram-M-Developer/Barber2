/**
 * BarberEase – Customer Service
 * 
 * Business logic for customer profile management.
 */

const bcrypt = require('bcrypt');
const config = require('../config/app');
const { Customer } = require('../models');

/** Get customer profile by ID. */
async function getProfile(customerId) {
  const customer = await Customer.findByPk(customerId);
  if (!customer) {
    const error = new Error('Customer not found');
    error.statusCode = 404;
    throw error;
  }
  return customer;
}

/** Update customer profile. */
async function updateProfile(customerId, data) {
  const customer = await Customer.findByPk(customerId);
  if (!customer) {
    const error = new Error('Customer not found');
    error.statusCode = 404;
    throw error;
  }

  const updateData = {};
  if (data.name) updateData.name = data.name;
  if (data.phone) updateData.phone = data.phone;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.gender) updateData.gender = data.gender;

  await customer.update(updateData);
  return customer;
}

/** Change customer password. */
async function changePassword(customerId, currentPassword, newPassword) {
  const customer = await Customer.scope('withPassword').findByPk(customerId);
  if (!customer) {
    const error = new Error('Customer not found');
    error.statusCode = 404;
    throw error;
  }

  const isMatch = await bcrypt.compare(currentPassword, customer.password);
  if (!isMatch) {
    const error = new Error('Current password is incorrect');
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);
  await customer.update({ password: hashedPassword });

  return { message: 'Password changed successfully' };
}

/** Get all customers (admin). */
async function getAllCustomers() {
  return await Customer.findAll({
    order: [['created_at', 'DESC']]
  });
}

/** Toggle customer active status (admin). */
async function toggleCustomerStatus(customerId) {
  const customer = await Customer.findByPk(customerId);
  if (!customer) {
    const error = new Error('Customer not found');
    error.statusCode = 404;
    throw error;
  }

  await customer.update({ is_active: !customer.is_active });
  return customer;
}

/** Top up customer wallet balance. */
async function topUpWallet(customerId, amount) {
  const customer = await Customer.findByPk(customerId);
  if (!customer) {
    const error = new Error('Customer not found');
    error.statusCode = 404;
    throw error;
  }

  const currentBalance = parseFloat(customer.wallet_balance || 0);
  const topUpAmount = parseFloat(amount || 0);

  if (isNaN(topUpAmount) || topUpAmount <= 0) {
    const error = new Error('Please provide a valid top up amount greater than zero.');
    error.statusCode = 400;
    throw error;
  }

  await customer.update({
    wallet_balance: currentBalance + topUpAmount
  });

  return customer;
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getAllCustomers,
  toggleCustomerStatus,
  topUpWallet
};
