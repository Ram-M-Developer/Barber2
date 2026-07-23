/**
 * BarberEase – Customer Controller
 * 
 * Handles customer profile updates, password changes,
 * and admin listings of customers.
 */

const customerService = require('../services/customer.service');

/** GET /api/customers/profile – Get customer profile */
async function getProfile(req, res) {
  const customer = await customerService.getProfile(req.user.id);
  res.json({
    success: true,
    data: customer
  });
}

/** PUT /api/customers/profile – Update customer profile */
async function updateProfile(req, res) {
  const customer = await customerService.updateProfile(req.user.id, req.body);
  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: customer
  });
}

/** PUT /api/customers/profile/password – Change password */
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const result = await customerService.changePassword(req.user.id, currentPassword, newPassword);
  res.json({
    success: true,
    message: result.message
  });
}

/** GET /api/customers – Get all customers (admin) */
async function getAll(req, res) {
  const customers = await customerService.getAllCustomers();
  res.json({
    success: true,
    data: customers
  });
}

/** PUT /api/customers/:id/toggle – Toggle customer status (admin) */
async function toggleStatus(req, res) {
  const customer = await customerService.toggleCustomerStatus(req.params.id);
  res.json({
    success: true,
    message: `Customer account ${customer.is_active ? 'activated' : 'deactivated'}`,
    data: customer
  });
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getAll,
  toggleStatus
};

/** PUT /api/customers/profile/wallet – Top up wallet balance */
async function topUp(req, res) {
  const { amount } = req.body;
  const customer = await customerService.topUpWallet(req.user.id, amount);

  // Broadcast wallet changes if needed, or send response
  res.json({
    success: true,
    message: `Successfully added $${parseFloat(amount).toFixed(2)} to your wallet balance.`,
    data: customer
  });
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getAll,
  toggleStatus,
  topUp
};
