/**
 * BarberEase – Model Index & Associations
 * 
 * Central module that:
 *   1. Imports all Sequelize models
 *   2. Defines associations (belongsTo, hasMany, hasOne)
 *   3. Exports everything as a single object
 * 
 * Associations:
 *   Customer  → hasMany Appointments, Queues, Tokens
 *   Service   → hasMany Appointments, Queues
 *   Chair     → hasMany Appointments
 *   Appointment → belongsTo Customer, Service, Chair | hasOne Token
 *   Queue     → belongsTo Customer, Service | hasOne Token
 *   Token     → belongsTo Customer, Appointment, Queue
 */

const { sequelize } = require('../config/database');

// Import all models
const Admin = require('./Admin');
const Customer = require('./Customer');
const Service = require('./Service');
const Chair = require('./Chair');
const Appointment = require('./Appointment');
const Queue = require('./Queue');
const Token = require('./Token');

// ─── Customer Associations ───────────────────

// Customer has many Appointments
Customer.hasMany(Appointment, {
  foreignKey: 'customer_id',
  as: 'appointments'
});

// Customer has many Queue entries
Customer.hasMany(Queue, {
  foreignKey: 'customer_id',
  as: 'queueEntries'
});

// Customer has many Tokens
Customer.hasMany(Token, {
  foreignKey: 'customer_id',
  as: 'tokens'
});

// ─── Service Associations ────────────────────

// Service has many Appointments
Service.hasMany(Appointment, {
  foreignKey: 'service_id',
  as: 'appointments'
});

// Service has many Queue entries
Service.hasMany(Queue, {
  foreignKey: 'service_id',
  as: 'queueEntries'
});

// ─── Chair Associations ─────────────────────

// Chair has many Appointments
Chair.hasMany(Appointment, {
  foreignKey: 'chair_id',
  as: 'appointments'
});

// Chair reserved by Customer (optional)
Chair.belongsTo(Customer, {
  foreignKey: 'reserved_by',
  as: 'reservedByCustomer'
});

// ─── Appointment Associations ────────────────

// Appointment belongs to Customer
Appointment.belongsTo(Customer, {
  foreignKey: 'customer_id',
  as: 'customer'
});

// Appointment belongs to Service
Appointment.belongsTo(Service, {
  foreignKey: 'service_id',
  as: 'service'
});

// Appointment belongs to Chair
Appointment.belongsTo(Chair, {
  foreignKey: 'chair_id',
  as: 'chair'
});

// Appointment has one Token
Appointment.hasOne(Token, {
  foreignKey: 'appointment_id',
  as: 'token'
});

// ─── Queue Associations ─────────────────────

// Queue belongs to Customer
Queue.belongsTo(Customer, {
  foreignKey: 'customer_id',
  as: 'customer'
});

// Queue belongs to Service
Queue.belongsTo(Service, {
  foreignKey: 'service_id',
  as: 'service'
});

// Queue has one Token
Queue.hasOne(Token, {
  foreignKey: 'queue_id',
  as: 'token'
});

// ─── Token Associations ─────────────────────

// Token belongs to Customer
Token.belongsTo(Customer, {
  foreignKey: 'customer_id',
  as: 'customer'
});

// Token belongs to Appointment (optional)
Token.belongsTo(Appointment, {
  foreignKey: 'appointment_id',
  as: 'appointment'
});

// Token belongs to Queue (optional)
Token.belongsTo(Queue, {
  foreignKey: 'queue_id',
  as: 'queue'
});

// ─── Export All Models ──────────────────────

module.exports = {
  sequelize,
  Admin,
  Customer,
  Service,
  Chair,
  Appointment,
  Queue,
  Token
};
