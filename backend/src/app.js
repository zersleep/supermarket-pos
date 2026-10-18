const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const config = require('./config/env');
const prisma = require('./config/db');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration with credentials support
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  config.clientUrl
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.indexOf(origin) !== -1 ||
      origin.endsWith('.onrender.com') ||
      config.nodeEnv === 'development'
    ) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS policy.'));
  },
  credentials: true
}));

// Body parsing with safe size limits
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Health Check Endpoint (safe: never leaks connection strings or secrets)
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    // Quick test query to verify database connectivity
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'error: ' + (config.nodeEnv === 'development' ? err.message : 'failed to connect');
  }

  const isHealthy = dbStatus === 'connected';

  return res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: config.nodeEnv,
    database: dbStatus
  });
});

// Main API routes
app.use('/api', routes);

// 404 handler for undefined API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.method} ${req.originalUrl}' not found.`
  });
});

// Centralized error handler
app.use(errorHandler);

// Start server if not imported by test runner
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`[Supermarket POS API] Server running on port ${config.port} (${config.nodeEnv})`);
    console.log(`[Health check] http://localhost:${config.port}/api/health`);
  });
}

module.exports = app;
