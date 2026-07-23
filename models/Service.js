/**
 * BarberEase – Service Model
 * 
 * Stores the grooming services offered by the
 * barber shop (haircuts, shaves, facials, etc.)
 * with pricing, duration, and category info.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Service = sequelize.define('services', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Service name is required' },
      len: {
        args: [2, 100],
        msg: 'Service name must be 2-100 characters'
      }
    }
  },

  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
    validate: {
      isInt: { msg: 'Duration must be a whole number' },
      min: {
        args: [5],
        msg: 'Duration must be at least 5 minutes'
      },
      max: {
        args: [300],
        msg: 'Duration cannot exceed 300 minutes'
      }
    }
  },

  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      isDecimal: { msg: 'Price must be a valid number' },
      min: {
        args: [0],
        msg: 'Price cannot be negative'
      }
    }
  },

  category: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'general'
  },

  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'services',
  timestamps: true,
  underscored: true
});

module.exports = Service;
