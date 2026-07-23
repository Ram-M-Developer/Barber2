/**
 * BarberEase – Report Service
 * 
 * Generates reports for admin dashboard:
 *   - Daily/Monthly appointment summaries
 *   - Chair utilization
 *   - Customer visit history
 *   - Peak booking hours
 *   - Service popularity
 */

const { Op, fn, col, literal } = require('sequelize');
const { Appointment, Customer, Service, Chair, Queue } = require('../models');

/**
 * Get daily appointment report for a specific date.
 */
async function getDailyReport(date) {
  const appointments = await Appointment.findAll({
    where: { appointment_date: date },
    include: [
      { model: Customer, as: 'customer' },
      { model: Service, as: 'service' },
      { model: Chair, as: 'chair' }
    ],
    order: [['time_slot', 'ASC']]
  });

  const summary = {
    date,
    total: appointments.length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
    pending: appointments.filter(a => ['pending', 'confirmed'].includes(a.status)).length,
    inProgress: appointments.filter(a => a.status === 'in_progress').length,
    revenue: appointments
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + parseFloat(a.service?.price || 0), 0),
    appointments
  };

  return summary;
}

/**
 * Get monthly appointment report for a specific year and month.
 */
async function getMonthlyReport(year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

  const appointments = await Appointment.findAll({
    where: {
      appointment_date: { [Op.between]: [startDate, endDate] }
    },
    include: [
      { model: Service, as: 'service' }
    ]
  });

  const summary = {
    year,
    month,
    total: appointments.length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
    revenue: appointments
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + parseFloat(a.service?.price || 0), 0)
  };

  return summary;
}

/**
 * Get chair utilization report.
 * Shows how many appointments each chair has served.
 */
async function getChairUtilization() {
  const chairs = await Chair.findAll({
    where: { is_active: true },
    order: [['chair_number', 'ASC']]
  });

  const utilization = [];

  for (const chair of chairs) {
    const totalAppointments = await Appointment.count({
      where: { chair_id: chair.id }
    });

    const completedAppointments = await Appointment.count({
      where: { chair_id: chair.id, status: 'completed' }
    });

    utilization.push({
      chair_number: chair.chair_number,
      name: chair.name,
      status: chair.status,
      total_appointments: totalAppointments,
      completed_appointments: completedAppointments
    });
  }

  return utilization;
}

/**
 * Get customer visit history for a specific customer.
 */
async function getCustomerVisitHistory(customerId) {
  return await Appointment.findAll({
    where: { customer_id: customerId },
    include: [
      { model: Service, as: 'service' },
      { model: Chair, as: 'chair' }
    ],
    order: [['appointment_date', 'DESC']]
  });
}

/**
 * Get peak booking hours analysis.
 * Returns count of appointments grouped by time slot.
 */
async function getPeakBookingHours() {
  const appointments = await Appointment.findAll({
    attributes: ['time_slot'],
    where: {
      status: { [Op.in]: ['confirmed', 'in_progress', 'completed'] }
    }
  });

  // Group by time slot
  const slotCounts = {};
  appointments.forEach(appt => {
    const slot = appt.time_slot;
    slotCounts[slot] = (slotCounts[slot] || 0) + 1;
  });

  // Convert to sorted array
  const peakHours = Object.entries(slotCounts)
    .map(([slot, count]) => ({ time_slot: slot, count }))
    .sort((a, b) => b.count - a.count);

  return peakHours;
}

/**
 * Get service popularity report.
 * Returns count of appointments per service.
 */
async function getServicePopularity() {
  const services = await Service.findAll({
    where: { is_active: true }
  });

  const popularity = [];

  for (const service of services) {
    const count = await Appointment.count({
      where: { service_id: service.id }
    });

    popularity.push({
      service_id: service.id,
      name: service.name,
      price: service.price,
      total_bookings: count
    });
  }

  return popularity.sort((a, b) => b.total_bookings - a.total_bookings);
}

/**
 * Get dashboard overview statistics.
 */
async function getDashboardStats() {
  const today = new Date().toISOString().split('T')[0];

  const todayAppointments = await Appointment.count({
    where: { appointment_date: today }
  });

  const todayCompleted = await Appointment.count({
    where: { appointment_date: today, status: 'completed' }
  });

  const totalCustomers = await Customer.count();

  const totalRevenue = await Appointment.findAll({
    where: { status: 'completed' },
    include: [{ model: Service, as: 'service' }]
  });

  const revenue = totalRevenue.reduce(
    (sum, a) => sum + parseFloat(a.service?.price || 0), 0
  );

  const queueWaiting = await Queue.count({
    where: { status: 'waiting' }
  });

  return {
    todayAppointments,
    todayCompleted,
    totalCustomers,
    totalRevenue: revenue.toFixed(2),
    queueWaiting
  };
}

module.exports = {
  getDailyReport,
  getMonthlyReport,
  getChairUtilization,
  getCustomerVisitHistory,
  getPeakBookingHours,
  getServicePopularity,
  getDashboardStats
};
