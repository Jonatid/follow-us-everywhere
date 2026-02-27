require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { uploadBuffer, getDownloadUrl } = require('./services/r2');
const db = require('./config/db');
const { ensureSchema } = require('./config/schema');
const { runMigrations } = require('./scripts/runMigrations');

// Import routes
const authRoutes = require('./routes/auth');
const businessesRoutes = require('./routes/businesses');
const socialsRoutes = require('./routes/socials');
const adminAuthRoutes = require('./routes/admin-auth');
const adminRoutes = require('./routes/admin');
const customerAuthRoutes = require('./routes/customers-auth');
const customerRoutes = require('./routes/customers');
const publicRoutes = require('./routes/public');
const badgesRoutes = require('./routes/badges');
const r2Routes = require('./routes/r2Routes');
const qrRoutes = require('./routes/qr');

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is required to start the server.');
  process.exit(1);
}

// Middleware
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://follow-us-everywhere-web.onrender.com',
    // Added for the new production custom frontend domain.
    'https://fuse101.com',
    'https://www.fuse101.com',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test database connection
app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ 
      status: 'ok', 
      message: 'Server is running',
      database: 'connected',
      timestamp: result.rows[0]
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(503).json({ 
      status: 'error', 
      message: 'Database connection failed',
      error: error.message 
    });
  }
});


const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Use multipart/form-data with field name "file".' });
    }

    const key = `${Date.now()}-${req.file.originalname}`;
    await uploadBuffer({
      key,
      buffer: req.file.buffer,
      contentType: req.file.mimetype
    });

    res.status(201).json({
      message: 'File uploaded successfully',
      key,
      bucket: process.env.R2_BUCKET
    });
  } catch (error) {
    next(error);
  }
});

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
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api', badgesRoutes);
app.use('/api/business', businessesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/customers/auth', customerAuthRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/r2', r2Routes);
app.use('/qr', qrRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
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
    console.error('Startup initialization error:', error.message);
    console.error('Server will continue to run, but database-backed routes may fail until connectivity is restored.');
  }

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    if (!startupInitializationOk) {
      console.warn('Startup completed in degraded mode due to initialization errors.');
    }
  });
};

startServer();

module.exports = app;
