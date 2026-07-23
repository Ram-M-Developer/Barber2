/**
 * BarberEase – Appointment Controller
 * 
 * Handles HTTP requests for appointment endpoints.
 */

const appointmentService = require('../services/appointment.service');
const queueService = require('../services/queue.service');

/** POST /api/appointments – Book a new appointment */
async function create(req, res) {
  const appointment = await appointmentService.createAppointment(req.user.id, req.body);

  // Broadcast chair update via Socket.IO
  const io = req.app.get('io');
  if (io) {
    io.emit('chair-update', { message: 'Chair status changed' });
    io.emit('appointment-update', { message: 'New appointment created' });
  }

  res.status(201).json({
    success: true,
    message: 'Appointment booked successfully',
    data: appointment
  });
}

/** GET /api/appointments/my – Get customer's appointments */
async function getMyAppointments(req, res) {
  const appointments = await appointmentService.getCustomerAppointments(req.user.id);

  res.json({
    success: true,
    data: appointments
  });
}

/** GET /api/appointments/:id – Get appointment details */
async function getById(req, res) {
  const appointment = await appointmentService.getAppointmentById(req.params.id);

  res.json({
    success: true,
    data: appointment
  });
}

/** GET /api/appointments – Get all appointments (admin) */
async function getAll(req, res) {
  const filters = {
    date: req.query.date,
    status: req.query.status,
    customer_id: req.query.customer_id
  };

  const appointments = await appointmentService.getAllAppointments(filters);

  res.json({
    success: true,
    data: appointments
  });
}

/** GET /api/appointments/today – Get today's appointments */
async function getToday(req, res) {
  const appointments = await appointmentService.getTodayAppointments();

  res.json({
    success: true,
    data: appointments
  });
}

/** PUT /api/appointments/:id/cancel – Cancel an appointment */
async function cancel(req, res) {
  const customerId = req.user.type === 'customer' ? req.user.id : null;
  const appointment = await appointmentService.cancelAppointment(req.params.id, customerId);

  // Broadcast updates
  const io = req.app.get('io');
  if (io) {
    io.emit('chair-update', { message: 'Chair released' });
    io.emit('appointment-update', { message: 'Appointment cancelled' });
  }

  res.json({
    success: true,
    message: 'Appointment cancelled',
    data: appointment
  });
}

/** PUT /api/appointments/:id/complete – Complete an appointment (admin) */
async function complete(req, res) {
  const appointment = await appointmentService.completeAppointment(req.params.id);

  // Automatically call the next customer in queue if any are waiting
  let queueResult = null;
  try {
    const queueStats = await queueService.getQueueStats();
    if (queueStats.waiting > 0) {
      queueResult = await queueService.callNextCustomer();
      console.log(`📡 Auto-Queue: Automatically called next customer ${queueResult.queueEntry.token_number} on chair release.`);
    }
  } catch (err) {
    console.warn('⚠️ Auto-Queue helper warning:', err.message);
  }

  // Broadcast updates
  const io = req.app.get('io');
  if (io) {
    io.emit('chair-update', { message: 'Chair status updated' });
    io.emit('appointment-update', { message: 'Appointment completed' });
    io.emit('queue-update', { message: 'Queue position changed' });
  }

  res.json({
    success: true,
    message: queueResult 
      ? `Appointment completed. Auto-called next waiting token: ${queueResult.queueEntry.token_number}`
      : 'Appointment completed. No customers waiting in queue.',
    data: appointment,
    autoCalled: queueResult || null
  });
}

/** PUT /api/appointments/:id/start – Start an appointment (admin) */
async function start(req, res) {
  const appointment = await appointmentService.startAppointment(req.params.id);

  const io = req.app.get('io');
  if (io) {
    io.emit('appointment-update', { message: 'Appointment started' });
  }

  res.json({
    success: true,
    message: 'Appointment started',
    data: appointment
  });
}

module.exports = { create, getMyAppointments, getById, getAll, getToday, cancel, complete, start };
