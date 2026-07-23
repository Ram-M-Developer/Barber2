/**
 * BarberEase – Chair Service
 * 
 * Business logic for chair management:
 *   - Get all chairs with status
 *   - Update chair status
 *   - Get available chairs
 *   - Get chair statistics
 *   - Reserve a chair (with timeout)
 *   - Release expired reservations
 */

const { Op } = require('sequelize');
const { Chair, Customer } = require('../models');
const config = require('../config/app');

/**
 * Get all chairs with their current status.
 */
async function getAllChairs() {
  return await Chair.findAll({
    where: { is_active: true },
    include: [
      { model: Customer, as: 'reservedByCustomer', attributes: ['id', 'name'] }
    ],
    order: [['chair_number', 'ASC']]
  });
}

/**
 * Get chair by ID.
 */
async function getChairById(id) {
  const chair = await Chair.findByPk(id, {
    include: [
      { model: Customer, as: 'reservedByCustomer', attributes: ['id', 'name'] }
    ]
  });

  if (!chair) {
    const error = new Error('Chair not found');
    error.statusCode = 404;
    throw error;
  }

  return chair;
}

/**
 * Get only available chairs.
 */
async function getAvailableChairs() {
  return await Chair.findAll({
    where: { status: 'available', is_active: true },
    order: [['chair_number', 'ASC']]
  });
}

/**
 * Update chair status (admin operation).
 * Valid transitions:
 *   any → maintenance (admin override)
 *   maintenance → available
 */
async function updateChairStatus(chairId, newStatus) {
  const chair = await Chair.findByPk(chairId);

  if (!chair) {
    const error = new Error('Chair not found');
    error.statusCode = 404;
    throw error;
  }

  const updateData = { status: newStatus };

  // Clear reservation data when releasing
  if (newStatus === 'available') {
    updateData.reserved_by = null;
    updateData.reserved_at = null;
  }

  await chair.update(updateData);
  return chair;
}

/**
 * Create a new chair (admin operation).
 */
async function createChair(data) {
  return await Chair.create({
    chair_number: data.chair_number,
    name: data.name || `Chair ${data.chair_number}`,
    status: 'available',
    is_active: true
  });
}

/**
 * Get chair statistics summary.
 * Returns counts by status for dashboard display.
 */
async function getChairStats() {
  const chairs = await Chair.findAll({ where: { is_active: true } });

  const stats = {
    total: chairs.length,
    available: 0,
    reserved: 0,
    occupied: 0,
    maintenance: 0
  };

  chairs.forEach(chair => {
    if (stats[chair.status] !== undefined) {
      stats[chair.status]++;
    }
  });

  return stats;
}

/**
 * Release chairs whose reservation has expired.
 * Called periodically to auto-release reservations
 * that exceed the configured timeout (default 5 min).
 */
async function releaseExpiredReservations() {
  const timeoutMs = config.reservationTimeoutMs;
  const cutoff = new Date(Date.now() - timeoutMs);

  const expired = await Chair.findAll({
    where: {
      status: 'reserved',
      reserved_at: { [Op.lt]: cutoff }
    }
  });

  for (const chair of expired) {
    await chair.update({
      status: 'available',
      reserved_by: null,
      reserved_at: null
    });
  }

  return expired.length;
}

/**
 * Temporarily reserve a chair for 5 minutes.
 */
async function reserveChair(chairId, customerId) {
  const chair = await Chair.findByPk(chairId);

  if (!chair) {
    const error = new Error('Chair not found');
    error.statusCode = 404;
    throw error;
  }

  if (chair.status !== 'available' || !chair.is_active) {
    const error = new Error('Chair is no longer available');
    error.statusCode = 409;
    throw error;
  }

  await chair.update({
    status: 'reserved',
    reserved_by: customerId,
    reserved_at: new Date()
  });

  return chair;
}

/**
 * Release a temporarily reserved chair.
 */
async function releaseChair(chairId, customerId) {
  const chair = await Chair.findByPk(chairId);

  if (!chair) {
    const error = new Error('Chair not found');
    error.statusCode = 404;
    throw error;
  }

  // Only release if it was reserved by this customer
  if (chair.status === 'reserved' && chair.reserved_by === customerId) {
    await chair.update({
      status: 'available',
      reserved_by: null,
      reserved_at: null
    });
  }

  return chair;
}

module.exports = {
  getAllChairs,
  getChairById,
  getAvailableChairs,
  updateChairStatus,
  createChair,
  getChairStats,
  releaseExpiredReservations,
  reserveChair,
  releaseChair
};
