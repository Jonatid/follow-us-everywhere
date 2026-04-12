require('dotenv').config({ path: `${__dirname}/.env` });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { getDownloadUrl } = require('./services/r2');
const { logger } = require('./config/logger');
const db = require('./config/db');
const { ensureSchema } = require('./config/schema');
const { runMigrations } = require('./scripts/runMigrations');
const { getCorsOptions } = require('./config/cors');
const {
  securityHeadersMiddleware,
  jsonBodyParser,
  urlencodedBodyParser,
  requestSizeLimitErrorHandler,
} = require('./config/security');
const { requestContextMiddleware } = require('./middleware/request-context');

// Import routes
const authRoutes = require('./routes/auth');
const businessesRoutes = require('./routes/businesses');
const socialsRoutes = require('./routes/socials');
const socialRoutes = require('./routes/social');
const adminAuthRoutes = require('./routes/admin-auth');
const adminRoutes = require('./routes/admin');
const customerAuthRoutes = require('./routes/customers-auth');
const customerRoutes = require('./routes/customers');
const publicRoutes = require('./routes/public');
const badgesRoutes = require('./routes/badges');
const r2Routes = require('./routes/r2Routes');
const qrRoutes = require('./routes/qr');
const uploadRoutes = require('./routes/uploadRoutes');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  logger.fatal('JWT_SECRET is required to start the server.');
  process.exit(1);
}

// Middleware
const corsOptions = getCorsOptions();

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(requestContextMiddleware);
app.use(securityHeadersMiddleware);
app.use(jsonBodyParser);
app.use(urlencodedBodyParser);
app.use(requestSizeLimitErrorHandler);
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint for uptime monitoring.
app.get('/api/health', async (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'Surrogate-Control': 'no-store'
  });

  let dbStatus = 'down';

  try {
    await Promise.race([
      db.query('SELECT 1'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB check timeout')), 300))
    ]);
    dbStatus = 'ok';
  } catch (_) {
    dbStatus = 'down';
  }

  res.status(200).json({
    ok: true,
    service: 'api',
    timestamp: new Date().toISOString(),
    db: dbStatus
  });
});

app.use('/', uploadRoutes);

app.get('/files/:key', async (req, res, next) => {
  try {
    const downloadUrl = await getDownloadUrl(req.params.key);
    res.json({ key: req.params.key, downloadUrl, expiresIn: 600 });
  } catch (error) {
    next(error);
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessesRoutes);
app.use('/api/socials', socialsRoutes);
app.use('/api/social', authenticateToken, socialRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api', badgesRoutes);
app.use('/api/business', businessesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/customers/auth', customerAuthRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/r2', r2Routes);
app.use('/qr', qrRoutes);

const candidateFrontendBuildDirs = [
  path.join(__dirname, '..', 'frontend', 'build'),
  path.join(__dirname, 'public'),
  path.join(process.cwd(), 'frontend', 'build'),
  path.join(process.cwd(), 'build')
];

const frontendBuildDir = candidateFrontendBuildDirs.find((dir) => fs.existsSync(path.join(dir, 'index.html')));

if (frontendBuildDir) {
  app.use(express.static(frontendBuildDir));

  app.get(/^\/(?!api|uploads|qr).*/, (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }

    return res.sendFile(path.join(frontendBuildDir, 'index.html'));
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  const requestLogger = req.log || logger;
  requestLogger.error({ err }, 'Unhandled request error');
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error' 
  });
});

const startServer = async () => {
  let startupInitializationOk = true;

  try {
    await runMigrations();
    await ensureSchema();
  } catch (error) {
    startupInitializationOk = false;
    logger.error({ err: error }, 'Startup initialization error. Server will continue in degraded mode.');
  }

  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Server is running');
    logger.info({ env: process.env.NODE_ENV || 'development' }, 'Environment loaded');
    if (!startupInitializationOk) {
      logger.warn('Startup completed in degraded mode due to initialization errors.');
    }
  });
};

startServer();

module.exports = app;
