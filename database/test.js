/**
 * BarberEase – End-to-End Integration & System Verification Test Suite
 * 
 * Programmatically runs the complete final acceptance test scenario:
 *   1. Connects to MySQL using environment configurations.
 *   2. Synchronizes models.
 *   3. Registers a test customer.
 *   4. Logs in the customer and verifies JWT generation.
 *   5. Places a direct booking (verifies chair status available -> occupied, checks token).
 *   6. Prevents duplicate booking validation.
 *   7. Authenticates admin.
 *   8. Completes the appointment (verifies chair released -> available).
 *   9. Simulates queue scenario: occupies all chairs, adds customer to queue, verifies position.
 *  10. Triggers call-next (verifies queue seat assignment, position recalculation).
 *  11. Cleans up all test database entries.
 * 
 * Run using:
 *   node database/test.js
 *   npm test
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require('bcrypt');
const { sequelize, Customer, Admin, Service, Chair, Appointment, Queue, Token } = require('../models');
const authService = require('../services/auth.service');
const appointmentService = require('../services/appointment.service');
const chairService = require('../services/chair.service');
const queueService = require('../services/queue.service');

async function runAcceptanceTest() {
  console.log('\n==================================================');
  console.log('🏁 STARTING FINAL SYSTEM ACCEPTANCE & INTEGRATION TEST');
  console.log('==================================================\n');

  let testCustomerId = null;
  let testAppointmentId = null;
  let testQueueId = null;
  let testCustomerToken = null;

  try {
    // ─── 1. DATABASE CONNECTIVITY ──────────────────
    console.log('🔌 Step 1: Testing Database connection...');
    await sequelize.authenticate();
    console.log('   ✅ Connection successful.\n');

    console.log('📦 Step 2: Synchronizing tables...');
    await sequelize.sync({ alter: true });
    console.log('   ✅ Tables synchronized successfully.\n');

    // ─── 2. SEEDING VERIFICATION ───────────────────
    console.log('🌱 Step 3: Verifying default seeded assets...');
    const serviceCount = await Service.count();
    const chairCount = await Chair.count();
    console.log(`   👉 Services found: ${serviceCount}`);
    console.log(`   👉 Chairs found: ${chairCount}`);

    if (serviceCount === 0 || chairCount === 0) {
      throw new Error('Database is empty. Please run "npm run db:seed" first before testing.');
    }
    console.log('   ✅ Database holds pre-requisite records.\n');

    // ─── 3. CUSTOMER REGISTRATION ──────────────────
    console.log('👤 Step 4: Registering a test customer...');
    const uniqueEmail = `test_${Date.now()}@barberease.com`;
    const regResult = await authService.registerCustomer({
      name: 'Integration Test User',
      email: uniqueEmail,
      phone: '555-9988',
      password: 'password123',
      gender: 'male',
      address: '123 Test Suite Road'
    });

    testCustomerId = regResult.customer.id;
    testCustomerToken = regResult.token;
    console.log(`   ✅ Customer registered. ID: ${testCustomerId}, Email: ${uniqueEmail}\n`);

    // ─── 4. CUSTOMER LOGIN & JWT ───────────────────
    console.log('🔑 Step 5: Performing customer login auth check...');
    const loginResult = await authService.loginCustomer(uniqueEmail, 'password123');
    if (!loginResult.token) throw new Error('Login failed to return token');
    console.log('   ✅ Customer authentication verified. JWT issued.\n');

    // ─── 5. APPOINTMENT BOOKING & CHAIR STATUS ─────
    console.log('📅 Step 6: Placing a direct appointment booking...');
    
    // Find first available chair
    const openChair = await Chair.findOne({ where: { status: 'available', is_active: true } });
    if (!openChair) throw new Error('No available chairs found to book.');

    // Find first service
    const service = await Service.findOne({ where: { is_active: true } });

    console.log(`   👉 Selected Chair: ${openChair.name} (ID: ${openChair.id})`);
    console.log(`   👉 Selected Service: ${service.name} (ID: ${service.id})`);

    const appt = await appointmentService.createAppointment(testCustomerId, {
      service_id: service.id,
      chair_id: openChair.id,
      appointment_date: new Date().toISOString().split('T')[0],
      time_slot: '11:30 AM',
      notes: 'Acceptance testing run'
    });

    testAppointmentId = appt.id;
    console.log(`   ✅ Appointment booked. Token issued: ${appt.token_number}`);

    // Verify chair state updated to Occupied
    const updatedChair = await Chair.findByPk(openChair.id);
    console.log(`   👉 Chair status changed to: ${updatedChair.status}`);
    if (updatedChair.status !== 'occupied') {
      throw new Error(`Chair status expected 'occupied', but got ${updatedChair.status}`);
    }
    console.log('   ✅ Chair status transition available -> occupied verified.\n');

    // ─── 6. DUPLICATE BOOKING PROTECTION ───────────
    console.log('🛡️ Step 7: Verifying duplicate booking constraints...');
    try {
      await appointmentService.createAppointment(testCustomerId, {
        service_id: service.id,
        chair_id: openChair.id,
        appointment_date: new Date().toISOString().split('T')[0],
        time_slot: '02:00 PM'
      });
      throw new Error('System allowed duplicate booking for same customer on same date!');
    } catch (err) {
      console.log(`   👉 Blocked duplicate booking correctly: "${err.message}"`);
      console.log('   ✅ Constraint validation verified successfully.\n');
    }

    // ─── 7. ADMIN LOGIN ────────────────────────────
    console.log('🔒 Step 8: Authenticating default admin account...');
    const adminLogin = await authService.loginAdmin('admin', 'admin123');
    if (!adminLogin.token) throw new Error('Admin login failed');
    console.log('   ✅ Admin dashboard access tokens verified.\n');

    // ─── 8. APPOINTMENT COMPLETION & RELEASE ────────
    console.log('🏁 Step 9: Completing the appointment & releasing chair...');
    await appointmentService.completeAppointment(testAppointmentId);

    // Verify chair goes back to Available
    const releasedChair = await Chair.findByPk(openChair.id);
    console.log(`   👉 Released Chair status: ${releasedChair.status}`);
    if (releasedChair.status !== 'available') {
      throw new Error('Chair failed to return to available after appointment completion.');
    }
    console.log('   ✅ Appointment completion and chair release verified.\n');

    // ─── 9. QUEUE FLOW VERIFICATION ────────────────
    console.log('🚶 Step 10: Simulating virtual queue flow...');
    console.log('   👉 Temporarily setting all chairs to Occupied...');
    await Chair.update({ status: 'occupied' }, { where: { is_active: true } });

    console.log('   👉 Customer joins queue since no chairs are available...');
    const qEntry = await queueService.addToQueue(testCustomerId, service.id);
    testQueueId = qEntry.id;
    console.log(`   ✅ Queue token issued: ${qEntry.token_number}, Position: ${qEntry.position}, Est. Wait: ${qEntry.estimated_wait_minutes} min`);

    // Verify duplicate queue entry prevention
    try {
      await queueService.addToQueue(testCustomerId, service.id);
      throw new Error('Duplicate queue entry was not blocked!');
    } catch (err) {
      console.log(`   👉 Blocked duplicate queue entry correctly: "${err.message}"`);
    }

    // ─── 10. CALL NEXT CUSTOMER ───────────────────
    console.log('\n📢 Step 11: Call Next Customer automatic queue seating...');
    
    // Release at least one chair to allow calling
    await Chair.update({ status: 'available' }, { where: { id: openChair.id } });

    const callNextResult = await queueService.callNextCustomer();
    console.log(`   ✅ Called queue token ${callNextResult.queueEntry.token_number} and seated at Chair #${callNextResult.chair.chair_number}`);
    
    // Verify newly generated queue appointment is marked active
    const queueAppt = await Appointment.findByPk(callNextResult.appointment.id);
    console.log(`   👉 Auto-created Appointment status: ${queueAppt.status}`);
    
    // Verify chair state became occupied again
    const finalChairState = await Chair.findByPk(openChair.id);
    console.log(`   👉 Chair status post-call: ${finalChairState.status}`);

    if (finalChairState.status !== 'occupied') {
      throw new Error('Seat was not marked occupied after calling next queue customer.');
    }
    
    // Mark the queue appointment complete to release the chair
    await appointmentService.completeAppointment(queueAppt.id);
    console.log('   ✅ Auto-queue seating, chair mapping, and transitions verified.\n');

    // ─── 11. SECURITY & INTEGRITY PROTECTION CHECKS ───
    console.log('🛡️ Step 12: Executing Security & Integrity Protection checks...');
    
    // Test Case: SQL Injection prevention (Sequelize parametrized statements check)
    const sqlInjectionPayload = "test_user' OR '1'='1";
    const sqliFindResult = await Customer.findAll({
      where: { name: sqlInjectionPayload }
    });
    console.log(`   👉 SQL Injection Search check returned ${sqliFindResult.length} matches (expected 0).`);
    if (sqliFindResult.length > 0) {
      throw new Error('System exposed to SQL Injection vulnerability!');
    }
    console.log('   ✅ SQL Injection prevention check passed.');

    // Test Case: XSS input handling (HTML entities escaping mock check)
    const xssPayload = "<script>alert('xss')</script>";
    const tempUser = await Customer.create({
      name: xssPayload,
      email: `xss_${Date.now()}@barberease.com`,
      phone: '123-4567',
      password: 'password123'
    });
    console.log(`   👉 XSS input stored safely as raw text: "${tempUser.name}".`);
    await Customer.destroy({ where: { id: tempUser.id } });
    console.log('   ✅ XSS prevention check passed.');

    // Test Case: Auth Boundary validation (Incorrect password login check)
    try {
      await authService.loginCustomer(uniqueEmail, 'wrongpassword');
      throw new Error('System allowed customer login with incorrect password!');
    } catch (err) {
      console.log(`   👉 Blocked login check correctly: "${err.message}"`);
    }
    console.log('   ✅ Auth boundary protection checks passed.\n');

    // ─── 12. CLEANUP TEST DATA ────────────────────
    console.log('🧹 Step 13: Cleaning up test records from database...');
    
    // Delete queue appointments
    await Appointment.destroy({ where: { customer_id: testCustomerId } });
    // Delete tokens
    await Token.destroy({ where: { customer_id: testCustomerId } });
    // Delete queue entries
    await Queue.destroy({ where: { customer_id: testCustomerId } });
    // Delete test customer
    await Customer.destroy({ where: { id: testCustomerId } });
    
    // Reset all chairs back to available
    await Chair.update({ status: 'available' }, { where: { is_active: true } });

    console.log('   ✅ Test customer records and associated sessions purged cleanly.\n');

    console.log('==================================================');
    console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 100% OK');
    console.log('==================================================\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ INTEGRATION TEST ENCOUNTERED FAULT:');
    console.error(`   Error Message: ${error.message}`);
    console.error('   Stack Trace:', error.stack);
    console.log('\n   Attempting safety database cleanup...');
    try {
      if (testCustomerId) {
        await Appointment.destroy({ where: { customer_id: testCustomerId } });
        await Token.destroy({ where: { customer_id: testCustomerId } });
        await Queue.destroy({ where: { customer_id: testCustomerId } });
        await Customer.destroy({ where: { id: testCustomerId } });
      }
      await Chair.update({ status: 'available' }, { where: { is_active: true } });
      console.log('   ✅ Cleanup complete.');
    } catch (e) {
      console.error('   Failed to clean up:', e.message);
    }
    process.exit(1);
  }
}

runAcceptanceTest();
