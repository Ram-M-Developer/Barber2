/**
 * BarberEase – Database Initialization
 * 
 * Syncs all Sequelize models with the MySQL database,
 * creating tables if they don't exist.
 * 
 * Usage:
 *   node database/init.js
 * 
 * Prerequisites:
 *   1. MySQL must be running
 *   2. The database specified in .env (DB_NAME) must exist
 *   3. The .env file must be configured with valid credentials
 * 
 * To create the database manually in MySQL:
 *   CREATE DATABASE barberease_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
 */

const path = require('path');

// Load environment variables from project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { sequelize } = require('../models');
const { testConnection } = require('../config/database');

async function initializeDatabase() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   BarberEase – Database Initialization       ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  try {
    // Step 1: Test connection
    console.log('📡 Testing database connection...');
    const connected = await testConnection();
    
    if (!connected) {
      console.error('');
      console.error('❌ Cannot connect to MySQL. Please check:');
      console.error('   1. MySQL is running');
      console.error('   2. Database exists (CREATE DATABASE barberease_db)');
      console.error('   3. .env credentials are correct');
      process.exit(1);
    }

    // Step 2: Sync all models (create tables)
    console.log('');
    console.log('📦 Syncing models with database...');
    
    // Use alter:true to update tables without dropping data
    // Use force:true ONLY in development to drop and recreate
    await sequelize.sync({ alter: true });

    console.log('');
    console.log('✅ All tables created/updated successfully:');
    console.log('   • admins');
    console.log('   • customers');
    console.log('   • services');
    console.log('   • chairs');
    console.log('   • appointments');
    console.log('   • queues');
    console.log('   • tokens');
    console.log('');
    console.log('🎉 Database initialization complete!');
    console.log('');
    console.log('Next step: Run "npm run db:seed" to create default admin and sample data.');

  } catch (error) {
    console.error('');
    console.error('❌ Database initialization failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

initializeDatabase();
