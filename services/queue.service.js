/**
 * BarberEase – Queue Service
 * 
 * Business logic for digital queue management:
 *   - Add customer to queue
 *   - Get queue status
 *   - Call next customer
 *   - Complete queue entry
 *   - Cancel queue entry
 *   - Recalculate positions
 *   - Get customer queue position
 */

const { Op } = require('sequelize');
const { sequelize, Queue, Customer, Service, Chair, Token, Appointment } = require('../models');
const { generateTokenNumber, calculateEstimatedWait } = require('../utils/helpers');

/**
 * Add a customer to the waiting queue.
 * Prevents duplicate queue entries.
 */
async function addToQueue(customerId, serviceId) {
  const transaction = await sequelize.transaction();

  try {
    // Verify service
    const service = await Service.findOne({
      where: { id: serviceId, is_active: true },
      transaction
    });

    if (!service) {
      const error = new Error('Service not found or inactive');
      error.statusCode = 404;
      throw error;
    }

    // Check for duplicate queue entry
    const existingEntry = await Queue.findOne({
      where: {
        customer_id: customerId,
        status: { [Op.in]: ['waiting', 'called'] }
      },
      transaction
    });

    if (existingEntry) {
      const error = new Error('You are already in the queue');
      error.statusCode = 409;
      throw error;
    }

    // Calculate position (last waiting + 1)
    const lastInQueue = await Queue.findOne({
      where: { status: { [Op.in]: ['waiting', 'called'] } },
      order: [['position', 'DESC']],
      transaction
    });

    const position = lastInQueue ? lastInQueue.position + 1 : 1;

    // Generate token
    const tokenNumber = await generateTokenNumber(Token);

    // Calculate estimated wait
    const avgDuration = service.duration_minutes || 30;
    const estimatedWait = calculateEstimatedWait(position, avgDuration);

    // Create queue entry
    const queueEntry = await Queue.create({
      customer_id: customerId,
      service_id: serviceId,
      token_number: tokenNumber,
      position,
      status: 'waiting',
      estimated_wait_minutes: estimatedWait
    }, { transaction });

    // Create token record
    await Token.create({
      token_number: tokenNumber,
      customer_id: customerId,
      queue_id: queueEntry.id,
      type: 'queue',
      token_date: new Date().toISOString().split('T')[0],
      status: 'active'
    }, { transaction });

    await transaction.commit();

    // Return with associations
    return await Queue.findByPk(queueEntry.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Service, as: 'service' }
      ]
    });

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Get all active queue entries (waiting + called).
 */
async function getActiveQueue() {
  return await Queue.findAll({
    where: { status: { [Op.in]: ['waiting', 'called', 'serving'] } },
    include: [
      { model: Customer, as: 'customer' },
      { model: Service, as: 'service' }
    ],
    order: [['position', 'ASC']]
  });
}

/**
 * Get a customer's current queue position.
 */
async function getCustomerQueueStatus(customerId) {
  const entry = await Queue.findOne({
    where: {
      customer_id: customerId,
      status: { [Op.in]: ['waiting', 'called', 'serving'] }
    },
    include: [
      { model: Service, as: 'service' }
    ]
  });

  return entry;
}

/**
 * Call the next waiting customer from the queue.
 * Assigns them to the first available chair.
 * 
 * This is triggered by Admin clicking "Call Next".
 */
async function callNextCustomer() {
  const transaction = await sequelize.transaction();

  try {
    // Find the first available chair
    const availableChair = await Chair.findOne({
      where: { status: 'available', is_active: true },
      order: [['chair_number', 'ASC']],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!availableChair) {
      const error = new Error('No chairs available at this time');
      error.statusCode = 409;
      throw error;
    }

    // Find the first waiting customer in queue
    const nextEntry = await Queue.findOne({
      where: { status: 'waiting' },
      order: [['position', 'ASC']],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!nextEntry) {
      const error = new Error('No customers waiting in queue');
      error.statusCode = 404;
      throw error;
    }

    // Update queue entry status
    await nextEntry.update({
      status: 'serving',
      called_at: new Date(),
      served_at: new Date()
    }, { transaction });

    // Occupy the chair
    await availableChair.update({
      status: 'occupied',
      reserved_by: nextEntry.customer_id,
      reserved_at: new Date()
    }, { transaction });

    // Create an appointment record from the queue
    const appointment = await Appointment.create({
      customer_id: nextEntry.customer_id,
      service_id: nextEntry.service_id,
      chair_id: availableChair.id,
      token_number: nextEntry.token_number,
      appointment_date: new Date().toISOString().split('T')[0],
      time_slot: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      status: 'in_progress',
      started_at: new Date()
    }, { transaction });

    // Update token to link to appointment
    await Token.update(
      { appointment_id: appointment.id, status: 'used' },
      { where: { queue_id: nextEntry.id }, transaction }
    );

    // Recalculate remaining queue positions
    await recalculatePositions(transaction);

    await transaction.commit();

    return {
      queueEntry: nextEntry,
      chair: availableChair,
      appointment
    };

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Cancel a queue entry.
 */
async function cancelQueueEntry(queueId, customerId = null) {
  const transaction = await sequelize.transaction();

  try {
    const where = { id: queueId };
    if (customerId) {
      where.customer_id = customerId;
    }

    const entry = await Queue.findOne({ where, transaction });

    if (!entry) {
      const error = new Error('Queue entry not found');
      error.statusCode = 404;
      throw error;
    }

    if (['completed', 'cancelled'].includes(entry.status)) {
      const error = new Error('Queue entry is already ' + entry.status);
      error.statusCode = 400;
      throw error;
    }

    await entry.update({
      status: 'cancelled',
      completed_at: new Date()
    }, { transaction });

    // Cancel the token
    await Token.update(
      { status: 'cancelled' },
      { where: { queue_id: queueId }, transaction }
    );

    // Recalculate positions
    await recalculatePositions(transaction);

    await transaction.commit();
    return entry;

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Recalculate queue positions after changes.
 * Reassigns sequential positions (1, 2, 3...) to
 * all remaining 'waiting' entries ordered by creation.
 */
async function recalculatePositions(transaction) {
  const waitingEntries = await Queue.findAll({
    where: { status: 'waiting' },
    order: [['created_at', 'ASC']],
    transaction
  });

  for (let i = 0; i < waitingEntries.length; i++) {
    const entry = waitingEntries[i];
    const newPosition = i + 1;
    const estimatedWait = calculateEstimatedWait(newPosition, 30);

    await entry.update({
      position: newPosition,
      estimated_wait_minutes: estimatedWait
    }, { transaction });
  }
}

/**
 * Get queue statistics for dashboard.
 */
async function getQueueStats() {
  const waiting = await Queue.count({ where: { status: 'waiting' } });
  const serving = await Queue.count({ where: { status: 'serving' } });
  const todayCompleted = await Queue.count({
    where: {
      status: 'completed',
      completed_at: {
        [Op.gte]: new Date(new Date().toISOString().split('T')[0])
      }
    }
  });

  return { waiting, serving, todayCompleted };
}

module.exports = {
  addToQueue,
  getActiveQueue,
  getCustomerQueueStatus,
  callNextCustomer,
  cancelQueueEntry,
  getQueueStats
};
