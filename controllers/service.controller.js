/**
 * BarberEase – Service Controller
 */

const serviceService = require('../services/service.service');

/** GET /api/services */
async function getAll(req, res) {
  const services = await serviceService.getAllServices();
  res.json({ success: true, data: services });
}

/** GET /api/services/admin – All including inactive */
async function getAllAdmin(req, res) {
  const services = await serviceService.getAllServicesAdmin();
  res.json({ success: true, data: services });
}

/** GET /api/services/:id */
async function getById(req, res) {
  const service = await serviceService.getServiceById(req.params.id);
  res.json({ success: true, data: service });
}

/** POST /api/services (admin) */
async function create(req, res) {
  const service = await serviceService.createService(req.body);
  res.status(201).json({ success: true, message: 'Service created', data: service });
}

/** PUT /api/services/:id (admin) */
async function update(req, res) {
  const service = await serviceService.updateService(req.params.id, req.body);
  res.json({ success: true, message: 'Service updated', data: service });
}

/** DELETE /api/services/:id (admin) */
async function remove(req, res) {
  const result = await serviceService.deleteService(req.params.id);
  res.json({ success: true, message: result.message });
}

module.exports = { getAll, getAllAdmin, getById, create, update, remove };
