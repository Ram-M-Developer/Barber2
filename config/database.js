/**
 * BarberEase – Database Configuration (Sequelize)
 * 
 * Establishes connection to MySQL using credentials
 * from environment variables via config/app.js.
 */

const { Sequelize } = require('sequelize');
const config = require('./app');

// Create Sequelize instance from environment config
const sequelize = new Sequelize(
  config.db.name,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: config.db.dialect,
    pool: config.db.pool,
    logging: config.db.logging,

    // Timezone for date handling
    timezone: '+00:00',

    // Define default model options
    define: {
      timestamps: true,       // Adds createdAt and updatedAt
      underscored: true,      // Use snake_case for columns
      freezeTableName: true   // Don't pluralize table names
    }
  }
);

/**
 * Test the database connection.
 * Call this during server startup to verify connectivity.
 * 
 * @returns {Promise<boolean>} true if connected, false otherwise
 */
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to database:', error.message);
    return false;
  }
}

module.exports = { sequelize, testConnection };
