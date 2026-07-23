/**
 * BarberEase – Chair Controller
 */

const chairService = require('../services/chair.service');

/** GET /api/chairs */
async function getAll(req, res) {
  const chairs = await chairService.getAllChairs();
  res.json({ success: true, data: chairs });
}

/** GET /api/chairs/available */
async function getAvailable(req, res) {
  const chairs = await chairService.getAvailableChairs();
  res.json({ success: true, data: chairs });
}

/** GET /api/chairs/stats */
async function getStats(req, res) {
  const stats = await chairService.getChairStats();
  res.json({ success: true, data: stats });
}

/** GET /api/chairs/:id */
async function getById(req, res) {
  const chair = await chairService.getChairById(req.params.id);
  res.json({ success: true, data: chair });
}

/** POST /api/chairs (admin) */
async function create(req, res) {
  const chair = await chairService.createChair(req.body);

  const io = req.app.get('io');
  if (io) io.emit('chair-update', { message: 'New chair added' });

  res.status(201).json({ success: true, message: 'Chair created', data: chair });
}

/** PUT /api/chairs/:id/status (admin) */
async function updateStatus(req, res) {
  const chair = await chairService.updateChairStatus(req.params.id, req.body.status);

  const io = req.app.get('io');
  if (io) io.emit('chair-update', { message: 'Chair status updated' });

  res.json({ success: true, message: 'Chair status updated', data: chair });
}

/** PUT /api/chairs/:id/reserve (customer) */
async function reserve(req, res) {
  const chair = await chairService.reserveChair(req.params.id, req.user.id);

  const io = req.app.get('io');
  if (io) io.emit('chair-update', { message: 'Chair reserved' });

  res.json({ success: true, message: 'Chair reserved for 5 minutes', data: chair });
}

/** PUT /api/chairs/:id/release (customer) */
async function release(req, res) {
  const chair = await chairService.releaseChair(req.params.id, req.user.id);

  const io = req.app.get('io');
  if (io) io.emit('chair-update', { message: 'Chair released' });

  res.json({ success: true, message: 'Chair released successfully', data: chair });
}

module.exports = { getAll, getAvailable, getStats, getById, create, updateStatus, reserve, release };
