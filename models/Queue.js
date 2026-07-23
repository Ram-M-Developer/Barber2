/**
 * BarberEase – Queue Model
 * 
 * Manages the digital waiting queue when all
 * chairs are unavailable. Customers receive a
 * token and wait in order until called.
 * 
 * Queue position updates dynamically as
 * customers are called and served.
 * 
 * Status flow:
 *   waiting → called → serving → completed
 *                  └→ cancelled
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Queue = sequelize.define('queues', {
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

  token_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Token number is required' }
    }
  },

  position: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      isInt: { msg: 'Position must be a whole number' },
      min: {
        args: [0],
        msg: 'Position cannot be negative'
      }
    }
  },

  status: {
    type: DataTypes.ENUM('waiting', 'called', 'serving', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'waiting'
  },

  estimated_wait_minutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },

  called_at: {
    type: DataTypes.DATE,
    allowNull: true
  },

  served_at: {
    type: DataTypes.DATE,
    allowNull: true
  },

  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'queues',
  timestamps: true,
  underscored: true
});

module.exports = Queue;
