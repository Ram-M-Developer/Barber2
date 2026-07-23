/**
 * BarberEase – Chair Model
 * 
 * Stores barber chairs with real-time status tracking.
 * 
 * Status values and their visual colors:
 *   🟢 available   - Green  (clickable, bookable)
 *   🟡 reserved    - Yellow (temporarily held, 5-min timeout)
 *   ⚫ occupied    - Grey   (customer being served)
 *   🔴 maintenance - Red    (out of service)
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Chair = sequelize.define('chairs', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  chair_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: {
      msg: 'Chair number already exists'
    },
    validate: {
      isInt: { msg: 'Chair number must be a whole number' },
      min: {
        args: [1],
        msg: 'Chair number must be at least 1'
      }
    }
  },

  name: {
    type: DataTypes.STRING(50),
    allowNull: true
  },

  status: {
    type: DataTypes.ENUM('available', 'reserved', 'occupied', 'maintenance'),
    allowNull: false,
    defaultValue: 'available'
  },

  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },

  // Tracks when a chair was reserved (for timeout logic)
  reserved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },

  // Tracks which customer reserved the chair
  reserved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'customers',
      key: 'id'
    }
  }
}, {
  tableName: 'chairs',
  timestamps: true,
  underscored: true
});

module.exports = Chair;
