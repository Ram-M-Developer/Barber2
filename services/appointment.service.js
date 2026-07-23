/**
 * BarberEase – Appointment Service
 * 
 * Business logic for appointment management:
 *   - Create appointment (book chair)
 *   - Get appointment by ID
 *   - Get customer appointments
 *   - Get all appointments (admin)
 *   - Update appointment status
 *   - Cancel appointment
 *   - Complete appointment
 *   - Get today's appointments
 */

const { Op } = require('sequelize');
const { sequelize, Appointment, Customer, Service, Chair, Token, Queue } = require('../models');
const { generateTokenNumber, getTodayDate } = require('../utils/helpers');

/**
 * Create a new appointment.
 * Uses a transaction to prevent race conditions.
 */
async function createAppointment(customerId, data) {
  const transaction = await sequelize.transaction();

  try {
    // Verify service exists and is active
    const service = await Service.findOne({
      where: { id: data.service_id, is_active: true },
      transaction
    });

    if (!service) {
      const error = new Error('Service not found or inactive');
      error.statusCode = 404;
      throw error;
    }

    // Verify customer exists
    const customer = await Customer.findOne({
      where: { id: customerId },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!customer) {
      const error = new Error('Customer not found');
      error.statusCode = 404;
      throw error;
    }

    const isWalletPayment = !data.payment_method || data.payment_method === 'redeem';
    const price = parseFloat(service.price);

    if (isWalletPayment) {
      const balance = parseFloat(customer.wallet_balance);
      if (balance < price) {
        const error = new Error(`Insufficient wallet balance. Service costs $${price.toFixed(2)} but your wallet has $${balance.toFixed(2)}. Please top up!`);
        error.statusCode = 402; // Payment Required
        throw error;
      }
      
      // Deduct service price from customer's wallet balance
      await customer.update({
        wallet_balance: balance - price
      }, { transaction });
    }

    // Verify chair exists and is available
    const chair = await Chair.findOne({
      where: { id: data.chair_id, status: 'available', is_active: true },
      transaction,
      lock: transaction.LOCK.UPDATE // Lock row to prevent race conditions
    });

    if (!chair) {
      const error = new Error('Chair is not available. Please select another chair.');
      error.statusCode = 409;
      throw error;
    }

    // Check for duplicate booking (same customer, same date, active status)
    const duplicate = await Appointment.findOne({
      where: {
        customer_id: customerId,
        appointment_date: data.appointment_date,
        status: { [Op.in]: ['pending', 'confirmed', 'in_progress'] }
      },
      transaction
    });

    if (duplicate) {
      const error = new Error('You already have an active appointment for this date');
      error.statusCode = 409;
      throw error;
    }

    // Generate token number
    const tokenNumber = await generateTokenNumber(Token);

    // Create appointment
    const appointment = await Appointment.create({
      customer_id: customerId,
      service_id: data.service_id,
      chair_id: data.chair_id,
      token_number: tokenNumber,
      appointment_date: data.appointment_date,
      time_slot: data.time_slot,
      status: 'confirmed',
      notes: data.notes || null
    }, { transaction });

    // Update chair status to occupied
    await chair.update({
      status: 'occupied',
      reserved_by: customerId,
      reserved_at: new Date()
    }, { transaction });

    // Create token record
    await Token.create({
      token_number: tokenNumber,
      customer_id: customerId,
      appointment_id: appointment.id,
      type: 'appointment',
      token_date: data.appointment_date,
      status: 'active'
    }, { transaction });

    await transaction.commit();

    // Return appointment with associations
    const fullAppointment = await Appointment.findByPk(appointment.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Service, as: 'service' },
        { model: Chair, as: 'chair' }
      ]
    });

    return fullAppointment;

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Get appointment by ID with full associations.
 */
async function getAppointmentById(id) {
  const appointment = await Appointment.findByPk(id, {
    include: [
      { model: Customer, as: 'customer' },
      { model: Service, as: 'service' },
      { model: Chair, as: 'chair' },
      { model: Token, as: 'token' }
    ]
  });

  if (!appointment) {
    const error = new Error('Appointment not found');
    error.statusCode = 404;
    throw error;
  }

  return appointment;
}

/**
 * Get all appointments for a specific customer.
 */
async function getCustomerAppointments(customerId) {
  return await Appointment.findAll({
    where: { customer_id: customerId },
    include: [
      { model: Service, as: 'service' },
      { model: Chair, as: 'chair' }
    ],
    order: [['appointment_date', 'DESC'], ['created_at', 'DESC']]
  });
}

/**
 * Get all appointments (admin view) with optional filters.
 */
async function getAllAppointments(filters = {}) {
  const where = {};

  if (filters.date) {
    where.appointment_date = filters.date;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.customer_id) {
    where.customer_id = filters.customer_id;
  }

  return await Appointment.findAll({
    where,
    include: [
      { model: Customer, as: 'customer' },
      { model: Service, as: 'service' },
      { model: Chair, as: 'chair' }
    ],
    order: [['appointment_date', 'DESC'], ['time_slot', 'ASC']]
  });
}

/**
 * Get today's appointments.
 */
async function getTodayAppointments() {
  return await Appointment.findAll({
    where: { appointment_date: getTodayDate() },
    include: [
      { model: Customer, as: 'customer' },
      { model: Service, as: 'service' },
      { model: Chair, as: 'chair' }
    ],
    order: [['time_slot', 'ASC']]
  });
}

/**
 * Cancel an appointment and release the chair.
 */
async function cancelAppointment(appointmentId, customerId = null) {
  const transaction = await sequelize.transaction();

  try {
    const where = { id: appointmentId };
    if (customerId) {
      where.customer_id = customerId; // Ensure customer owns the appointment
    }

    const appointment = await Appointment.findOne({
      where,
      transaction
    });

    if (!appointment) {
      const error = new Error('Appointment not found');
      error.statusCode = 404;
      throw error;
    }

    if (['completed', 'cancelled'].includes(appointment.status)) {
      const error = new Error('Appointment is already ' + appointment.status);
      error.statusCode = 400;
      throw error;
    }

    // Cancel the appointment
    await appointment.update({ status: 'cancelled' }, { transaction });

    // Release the chair
    if (appointment.chair_id) {
      await Chair.update(
        { status: 'available', reserved_by: null, reserved_at: null },
        { where: { id: appointment.chair_id }, transaction }
      );
    }

    // Cancel the token
    await Token.update(
      { status: 'cancelled' },
      { where: { appointment_id: appointmentId }, transaction }
    );

    await transaction.commit();
    return appointment;

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Complete an appointment and release the chair.
 * Called by admin when a customer's service is finished.
 */
async function completeAppointment(appointmentId) {
  const transaction = await sequelize.transaction();

  try {
    const appointment = await Appointment.findByPk(appointmentId, { transaction });

    if (!appointment) {
      const error = new Error('Appointment not found');
      error.statusCode = 404;
      throw error;
    }

    if (appointment.status === 'completed') {
      const error = new Error('Appointment is already completed');
      error.statusCode = 400;
      throw error;
    }

    // Mark as completed
    await appointment.update({
      status: 'completed',
      completed_at: new Date()
    }, { transaction });

    // Release the chair
    if (appointment.chair_id) {
      await Chair.update(
        { status: 'available', reserved_by: null, reserved_at: null },
        { where: { id: appointment.chair_id }, transaction }
      );
    }

    // Mark token as used
    await Token.update(
      { status: 'used' },
      { where: { appointment_id: appointmentId }, transaction }
    );

    await transaction.commit();
    return appointment;

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Start an appointment (mark as in_progress).
 */
async function startAppointment(appointmentId) {
  const appointment = await Appointment.findByPk(appointmentId);

  if (!appointment) {
    const error = new Error('Appointment not found');
    error.statusCode = 404;
    throw error;
  }

  await appointment.update({
    status: 'in_progress',
    started_at: new Date()
  });

  return appointment;
}

module.exports = {
  createAppointment,
  getAppointmentById,
  getCustomerAppointments,
  getAllAppointments,
  getTodayAppointments,
  cancelAppointment,
  completeAppointment,
  startAppointment
};
