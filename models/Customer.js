/**
 * BarberEase – Customer Model
 * 
 * Stores customer accounts who register to
 * book appointments, join queues, and manage
 * their grooming sessions.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Customer = sequelize.define('customers', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Name is required' },
      len: {
        args: [2, 100],
        msg: 'Name must be 2-100 characters'
      }
    }
  },

  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: {
      msg: 'Email already registered'
    },
    validate: {
      notEmpty: { msg: 'Email is required' },
      isEmail: { msg: 'Please provide a valid email' }
    }
  },

  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Phone number is required' }
    }
  },

  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Password is required' },
      len: {
        args: [6, 255],
        msg: 'Password must be at least 6 characters'
      }
    }
  },

  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: true
  },

  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },

  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },

  wallet_balance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 100.00 // Default free $100 for simulated checkout payments
  }
}, {
  tableName: 'customers',
  timestamps: true,
  underscored: true,

  // Exclude password from default JSON output
  defaultScope: {
    attributes: { exclude: ['password'] }
  },

  // Scope that includes password (for login queries)
  scopes: {
    withPassword: {
      attributes: { include: ['password'] }
    }
  }
});

module.exports = Customer;
