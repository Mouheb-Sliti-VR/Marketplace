require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const compression = require('compression');

// Import security middleware
const {
  helmetMiddleware,
  apiRateLimiter,
  sanitizeMiddleware,
  getCorsOptions,
  requestLogger,
  enforceHTTPS,
} = require('./Middleware/securityMiddleware');
const { errorConverter, errorHandler, notFound } = require('./Middleware/errorHandler');
const logger = require('./utils/logger');

// Import routes
const registerRoute = require("./Routes/AuthenticationRoute");
const mediaRoute = require("./Routes/MediaRoute");
const ThreeDRoute = require("./Routes/3dMediaRoute");
const catalogRoute = require("./Routes/catalogRoute");

// Memory monitoring (improved with logger)
const used = process.memoryUsage();
const formatMemoryUsage = (data) => `${Math.round(data / 1024 / 1024 * 100) / 100} MB`;

setInterval(() => {
    const memoryData = {};
    for (let key in used) {
        memoryData[key] = formatMemoryUsage(process.memoryUsage()[key]);
    }
    logger.info('Memory usage:', memoryData);
    
    // Warning if memory usage is high (but don't force GC)
    const currentHeapUsed = process.memoryUsage().heapUsed;
    if (currentHeapUsed > 400 * 1024 * 1024) { // 400MB
        logger.warn(`High memory usage detected: ${formatMemoryUsage(currentHeapUsed)}`);
    }
}, 300000); // Check every 5 minutes

// Define base API path
const API_BASE_PATH = process.env.NODE_ENV === 'production' ? '/api' : '';

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.DB_URI;

// Trust proxy - important for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security Middleware (must be early in the chain)
app.use(enforceHTTPS);
app.use(helmetMiddleware);
app.use(requestLogger);

// CORS Configuration
app.use(cors(getCorsOptions()));

// Body parsing middleware with reasonable limits
const maxJsonSize = process.env.MAX_JSON_SIZE || '10';
const maxFileSize = process.env.MAX_FILE_SIZE || '100';
app.use(express.json({ limit: `${maxJsonSize}mb` }));
app.use(express.urlencoded({ extended: true, limit: `${maxJsonSize}mb` }));

// Data sanitization against NoSQL injection
app.use(sanitizeMiddleware);

// Compression
app.use(compression());

// Cache control for static files
app.use((req, res, next) => {
    if (req.url.startsWith(`${API_BASE_PATH}/uploads`)) {
        res.set('Cache-Control', 'public, max-age=31536000'); // 1 year
    }
    next();
});

// Serve static files from uploads directory
app.use(`${API_BASE_PATH}/uploads`, express.static(path.join(__dirname, 'uploads')));

// Error handling for static files
app.use(`${API_BASE_PATH}/uploads`, (err, req, res, next) => {
    logger.error('Static file error:', err);
    res.status(404).json({ error: 'File not found' });
});

// MongoDB Connection with retry logic
const connectDB = async () => {
  const connectWithRetry = async (retries = 5) => {
    for (let i = 0; i < retries; i++) {
      try {
        await mongoose.connect(MONGODB_URI, {
          maxPoolSize: 10,
          minPoolSize: 2,
          socketTimeoutMS: 45000,
          serverSelectionTimeoutMS: 5000,
        });
        logger.info("✅ Connected to MongoDB");
        return;
      } catch (err) {
        logger.error(`❌ MongoDB connection attempt ${i + 1} failed:`, err.message);
        if (i < retries - 1) {
          const delay = Math.min(1000 * Math.pow(2, i), 10000);
          logger.info(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          logger.error("Failed to connect to MongoDB after multiple attempts");
          process.exit(1);
        }
      }
    }
  };
  
  await connectWithRetry();
};

// MongoDB event handlers
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB error:', err);
});

// Connect to database
connectDB();

// Apply rate limiting to API routes
app.use(`${API_BASE_PATH}/`, apiRateLimiter);

// Routes
app.use(`${API_BASE_PATH}/auth`, registerRoute);
app.use(`${API_BASE_PATH}/media`, mediaRoute);
app.use(`${API_BASE_PATH}/3d`, ThreeDRoute);
app.use(`${API_BASE_PATH}/catalog`, catalogRoute);

// Health Check Routes
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "up", 
    timestamp: new Date(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

app.get("/health-check", (req, res) => {
  res.status(200).json({ status: "up", timestamp: new Date() });
});

// 404 handler - must be after all routes
app.use(notFound);

// Error handling middleware - must be last
app.use(errorConverter);
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      process.exit(0);
    } catch (err) {
      logger.error('Error during graceful shutdown:', err);
      process.exit(1);
    }
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Start Server
const server = app.listen(PORT, () => {
  logger.info(`🚀 Marketplace running on http://localhost:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`API Base Path: ${API_BASE_PATH || '/'}`);
});

// Handle process termination
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

