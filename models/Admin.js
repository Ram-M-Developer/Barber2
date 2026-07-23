/**
 * BarberEase – Admin Model
 * 
 * Stores admin/staff accounts for managing
 * the barber shop system. Supports role-based
 * access with 'super_admin' and 'admin' roles.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Admin = sequelize.define('admins', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: {
      msg: 'Username already exists'
    },
    validate: {
      notEmpty: { msg: 'Username is required' },
      len: {
        args: [3, 50],
        msg: 'Username must be 3-50 characters'
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

  full_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Full name is required' }
    }
  },

  role: {
    type: DataTypes.ENUM('super_admin', 'admin'),
    allowNull: false,
    defaultValue: 'admin'
  },

  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },

  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'admins',
  timestamps: true,
  underscored: true,

  // Exclude password from default JSON serialization
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

module.exports = Admin;
