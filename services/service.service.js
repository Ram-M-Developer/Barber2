/**
 * BarberEase – Service Management Service
 * 
 * CRUD operations for grooming services.
 */

const { Service } = require('../models');

/** Get all active services. */
async function getAllServices() {
  return await Service.findAll({
    where: { is_active: true },
    order: [['category', 'ASC'], ['name', 'ASC']]
  });
}

/** Get all services including inactive (admin). */
async function getAllServicesAdmin() {
  return await Service.findAll({
    order: [['category', 'ASC'], ['name', 'ASC']]
  });
}

/** Get service by ID. */
async function getServiceById(id) {
  const service = await Service.findByPk(id);
  if (!service) {
    const error = new Error('Service not found');
    error.statusCode = 404;
    throw error;
  }
  return service;
}

/** Create a new service. */
async function createService(data) {
  return await Service.create({
    name: data.name,
    description: data.description || null,
    duration_minutes: data.duration_minutes || 30,
    price: data.price || 0,
    category: data.category || 'general',
    is_active: true
  });
}

/** Update an existing service. */
async function updateService(id, data) {
  const service = await getServiceById(id);
  await service.update(data);
  return service;
}

/** Soft delete a service (deactivate). */
async function deleteService(id) {
  const service = await getServiceById(id);
  await service.update({ is_active: false });
  return { message: 'Service deactivated successfully' };
}

module.exports = {
  getAllServices,
  getAllServicesAdmin,
  getServiceById,
  createService,
  updateService,
  deleteService
};
