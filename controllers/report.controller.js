/**
 * BarberEase – Report Controller
 * 
 * Handles report generation endpoints for Admin.
 */

const reportService = require('../services/report.service');
const { getTodayDate } = require('../utils/helpers');

/** GET /api/reports/daily – Daily report */
async function getDaily(req, res) {
  const date = req.query.date || getTodayDate();
  const report = await reportService.getDailyReport(date);
  res.json({
    success: true,
    data: report
  });
}

/** GET /api/reports/monthly – Monthly report */
async function getMonthly(req, res) {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
  const report = await reportService.getMonthlyReport(year, month);
  res.json({
    success: true,
    data: report
  });
}

/** GET /api/reports/chairs – Chair utilization report */
async function getChairsReport(req, res) {
  const report = await reportService.getChairUtilization();
  res.json({
    success: true,
    data: report
  });
}

/** GET /api/reports/customers/:id/history – Customer visit history */
async function getCustomerHistory(req, res) {
  const report = await reportService.getCustomerVisitHistory(req.params.id);
  res.json({
    success: true,
    data: report
  });
}

/** GET /api/reports/peak-hours – Peak booking hours */
async function getPeakHours(req, res) {
  const report = await reportService.getPeakBookingHours();
  res.json({
    success: true,
    data: report
  });
}

/** GET /api/reports/services – Service popularity report */
async function getServicesReport(req, res) {
  const report = await reportService.getServicePopularity();
  res.json({
    success: true,
    data: report
  });
}

/** GET /api/reports/dashboard-stats – Admin Dashboard overview stats */
async function getStats(req, res) {
  const report = await reportService.getDashboardStats();
  res.json({
    success: true,
    data: report
  });
}

module.exports = {
  getDaily,
  getMonthly,
  getChairsReport,
  getCustomerHistory,
  getPeakHours,
  getServicesReport,
  getStats
};
