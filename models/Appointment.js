/**
 * BarberEase – Appointment Model
 * 
 * Stores booked appointments linking a customer
 * to a service and chair, with status tracking
 * through the full appointment lifecycle.
 * 
 * Status flow:
 *   pending → confirmed → in_progress → completed
 *                     └→ cancelled
 *                     └→ no_show
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Appointment = sequelize.define('appointments', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'customers',
      key: 'id'
    }
  },

  service_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'services',
      key: 'id'
    }
  },

  chair_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'chairs',
      key: 'id'
    }
  },

  token_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Token number is required' }
    }
  },

  appointment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: { msg: 'Please provide a valid date' },
      notEmpty: { msg: 'Appointment date is required' }
    }
  },

  time_slot: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Time slot is required' }
    }
  },

  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'),
    allowNull: false,
    defaultValue: 'pending'
  },

  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  started_at: {
    type: DataTypes.DATE,
    allowNull: true
  },

  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'appointments',
  timestamps: true,
  underscored: true
});

module.exports = Appointment;
