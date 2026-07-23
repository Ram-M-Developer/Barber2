/**
 * BarberEase – Database Seed Script
 * 
 * Seeds the database with:
 *   1. Default admin account
 *   2. Sample services (6 grooming services)
 *   3. Sample chairs (8 barber chairs)
 * 
 * Usage:
 *   node database/seed.js
 *   npm run db:seed
 * 
 * Prerequisites:
 *   1. Database must be initialized (npm run db:init)
 *   2. .env must be configured
 * 
 * Note: This script is idempotent — it checks for
 * existing records before inserting to avoid duplicates.
 */

const path = require('path');

// Load environment variables from project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require('bcrypt');
const config = require('../config/app');
const { sequelize, Admin, Service, Chair } = require('../models');
const { testConnection } = require('../config/database');

async function seedDatabase() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   BarberEase – Database Seeding              ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  try {
    // Test connection
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Cannot connect to database. Run "npm run db:init" first.');
      process.exit(1);
    }

    // ─── 1. Seed Default Admin ──────────────────

    console.log('👤 Seeding default admin account...');
    
    const existingAdmin = await Admin.scope('withPassword').findOne({
      where: { username: 'admin' }
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', config.bcrypt.saltRounds);
      
      await Admin.create({
        username: 'admin',
        email: 'admin@barberease.com',
        password: hashedPassword,
        full_name: 'System Administrator',
        role: 'super_admin',
        is_active: true
      });
      
      console.log('   ✅ Admin created:');
      console.log('      Username : admin');
      console.log('      Password : admin123');
      console.log('      ⚠️  Change this password after first login!');
    } else {
      console.log('   ⏭️  Admin already exists, skipping.');
    }

    // ─── 2. Seed Services ───────────────────────

    console.log('');
    console.log('✂️  Seeding grooming services...');
    
    const serviceCount = await Service.count();
    
    if (serviceCount === 0) {
      const services = [
        {
          name: 'Signature Haircut & Styling',
          description: 'Bespoke haircut tailored to your head shape, including hair wash, hot towel rinse, and premium pomade styling.',
          duration_minutes: 45,
          price: 45.00,
          category: 'haircut'
        },
        {
          name: 'Executive Skin Fade',
          description: 'Ultra-clean taper or zero skin fade crafted with precision foil shaver and straight razor edge-up.',
          duration_minutes: 50,
          price: 50.00,
          category: 'haircut'
        },
        {
          name: 'Royal Hot Towel Shave',
          description: 'Traditional straight razor shave with multi-layered hot towel treatment, pre-shave oil, and soothing balm.',
          duration_minutes: 35,
          price: 35.00,
          category: 'shave'
        },
        {
          name: 'Beard Sculpt & Line-Up',
          description: 'Detailed beard trimming, length shaping, cheek razor line-up, and organic beard oil hydration.',
          duration_minutes: 30,
          price: 30.00,
          category: 'beard'
        },
        {
          name: 'VIP Master Grooming Package',
          description: 'The ultimate royal treatment combining Signature Haircut, Royal Hot Towel Shave, Detox Facial, and scalp therapy.',
          duration_minutes: 80,
          price: 85.00,
          category: 'vip'
        },
        {
          name: 'Detox Scalp & Facial Spa',
          description: 'Deep cleansing charcoal mask, pore steam treatment, scalp exfoliation, and relaxing face massage.',
          duration_minutes: 30,
          price: 40.00,
          category: 'facial'
        }
      ];

      await Service.bulkCreate(services);
      console.log(`   ✅ ${services.length} services created.`);
    } else {
      console.log(`   ⏭️  ${serviceCount} services already exist, skipping.`);
    }

    // ─── 3. Seed Chairs ─────────────────────────

    console.log('');
    console.log('💺 Seeding barber chairs...');
    
    const chairCount = await Chair.count();
    
    if (chairCount === 0) {
      const chairs = [];
      
      for (let i = 1; i <= 8; i++) {
        chairs.push({
          chair_number: i,
          name: `Chair ${i}`,
          status: 'available',
          is_active: true
        });
      }

      await Chair.bulkCreate(chairs);
      console.log(`   ✅ ${chairs.length} chairs created (all available).`);
    } else {
      console.log(`   ⏭️  ${chairCount} chairs already exist, skipping.`);
    }

    // ─── Done ───────────────────────────────────

    console.log('');
    console.log('════════════════════════════════════════════════');
    console.log('🎉 Database seeding complete!');
    console.log('');
    console.log('You can now start the server:');
    console.log('   npm start      (production)');
    console.log('   npm run dev    (development with nodemon)');
    console.log('');
    console.log('Default Admin Login:');
    console.log('   Username : admin');
    console.log('   Password : admin123');
    console.log('════════════════════════════════════════════════');

  } catch (error) {
    console.error('');
    console.error('❌ Seeding failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

seedDatabase();
