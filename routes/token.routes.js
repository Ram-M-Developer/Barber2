/**
 * BarberEase – Token Routes
 */

const express = require('express');
const router = express.Router();
const { Token, Customer } = require('../models');
const authenticate = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const asyncWrapper = require('../middleware/asyncWrapper');

// GET /api/tokens/:number – Get details of a specific token
router.get('/:number', authenticate, asyncWrapper(async (req, res) => {
  const token = await Token.findOne({
    where: { token_number: req.params.number },
    include: [
      { model: Customer, as: 'customer', attributes: ['id', 'name'] }
    ]
  });

  if (!token) {
    return res.status(404).json({
      success: false,
      message: 'Token not found'
    });
  }

  // Customers can only view their own token details; Admins can view any token
  if (req.user.type === 'customer' && token.customer_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not own this token.'
    });
  }

  res.json({
    success: true,
    data: token
  });
}));

module.exports = router;
