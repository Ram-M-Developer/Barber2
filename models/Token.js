/**
 * BarberEase – Token Model
 * 
 * Generates and tracks digital tokens issued to
 * customers for both direct appointments and
 * queue entries. Token numbers are sequential
 * per day and never change once assigned.
 * 
 * Types:
 *   'appointment' - Token linked to a direct chair booking
 *   'queue'       - Token linked to a waiting queue entry
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Token = sequelize.define('tokens', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  token_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Token number is required' }
    }
  },

  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'customers',
      key: 'id'
    }
  },

  appointment_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'appointments',
      key: 'id'
    }
  },

  queue_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'queues',
      key: 'id'
    }
  },

  type: {
    type: DataTypes.ENUM('appointment', 'queue'),
    allowNull: false,
    defaultValue: 'appointment'
  },

  token_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },

  status: {
    type: DataTypes.ENUM('active', 'used', 'expired', 'cancelled'),
    allowNull: false,
    defaultValue: 'active'
  }
}, {
  tableName: 'tokens',
  timestamps: true,
  underscored: true
});

module.exports = Token;
