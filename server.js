/**
 * BarberEase – Server Entry Point
 * 
 * Initializes Express server with:
 *   - Security middleware (Helmet, CORS, Rate Limiting)
 *   - JSON body parsing
 *   - Static file serving
 *   - Socket.IO real-time server
 *   - Database connection verification
 *   - Route mounting
 * 
 * All configuration is read from environment variables
 * via config/app.js. See .env.example for required values.
 */

const express = require('express');
const http = require('http');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Server: SocketIOServer } = require('socket.io');

const config = require('./config/app');
const { testConnection } = require('./config/database');

// ─── Create Express App ──────────────────────────
const app = express();
const server = http.createServer(app);

// ─── Socket.IO Server ────────────────────────────
const io = new SocketIOServer(server, {
  cors: {
    origin: config.clientUrl,
    methods: ['GET', 'POST']
  }
});

// Make io accessible to routes/controllers via req.app
app.set('io', io);

// ─── Security Middleware ─────────────────────────

// Helmet: Sets various HTTP security headers
app.use(helmet({
  contentSecurityPolicy: false,   // Disabled for inline scripts in HTML views
  crossOriginEmbedderPolicy: false
}));

// CORS: Allow requests from configured client URL
app.use(cors({
  origin: config.clientUrl,
  credentials: true
}));

// Rate Limiting: Prevent brute-force and DDoS
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// ─── Body Parsing ────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Static Files ────────────────────────────────

app.use(express.static(path.join(__dirname, 'public')));

// ─── View Engine (Serve HTML files) ──────────────

app.set('views', path.join(__dirname, 'views'));

// ─── Health Check ────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'BarberEase API is running',
    environment: config.env,
    timestamp: new Date().toISOString()
  });
});

// ─── Routes (mounted in Phase 3) ────────────────

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/customers', require('./routes/customer.routes'));
app.use('/api/services', require('./routes/service.routes'));
app.use('/api/chairs', require('./routes/chair.routes'));
app.use('/api/appointments', require('./routes/appointment.routes'));
app.use('/api/queue', require('./routes/queue.routes'));
app.use('/api/tokens', require('./routes/token.routes'));
app.use('/api/reports', require('./routes/report.routes'));

// ─── Page Routes (mounted in Phase 4) ───────────

// Serve landing page as default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// ─── 404 Handler ─────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// ─── Global Error Handler ────────────────────────

const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// ─── Socket.IO Connection Handler ────────────────

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Join a room based on user role (will be enhanced in Phase 6)
  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`📡 Socket ${socket.id} joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// ─── Start Server ────────────────────────────────

// ─── Start Server ────────────────────────────────

const chairService = require('./services/chair.service');

function startReservationTimeoutCleaner() {
  setInterval(async () => {
    try {
      const releasedCount = await chairService.releaseExpiredReservations();
      if (releasedCount > 0) {
        console.log(`⏰ Cleaned up ${releasedCount} expired chair reservations.`);
        io.emit('chair-update', { message: 'Expired reservations released' });
      }
    } catch (err) {
      console.error('Error cleaning expired reservations:', err.message);
    }
  }, 15000); // Check every 15 seconds
}

async function startServer() {
  // Verify database connection before starting
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.error('⚠️  Server starting without database connection.');
    console.error('   Please check your .env database configuration.');
  }

  server.listen(config.port, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║     BarberEase – Smart Appointment System    ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  Environment : ${config.env.padEnd(30)}║`);
    console.log(`║  Server      : http://localhost:${config.port}${' '.repeat(Math.max(0, 14 - String(config.port).length))}║`);
    console.log(`║  API Health  : http://localhost:${config.port}/api/health ║`);
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
    
    // Start background cleaner loop
    startReservationTimeoutCleaner();
  });
}

startServer();

module.exports = { app, server, io };
