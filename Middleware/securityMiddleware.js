const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const logger = require('../utils/logger');

/**
 * Helmet middleware for setting security headers
 */
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

/**
 * Rate limiting middleware to prevent brute force attacks
 */
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        error: 'Too many requests from this IP, please try again later.',
      });
    },
  });
};

/**
 * Strict rate limiter for authentication endpoints
 */
const authRateLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 requests per 15 minutes

/**
 * Standard rate limiter for API endpoints
 */
const apiRateLimiter = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
);

/**
 * Generous rate limiter for file uploads
 */
const uploadRateLimiter = createRateLimiter(15 * 60 * 1000, 20); // 20 uploads per 15 minutes

/**
 * MongoDB query sanitization to prevent NoSQL injection
 */
const sanitizeMiddleware = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn(`Sanitized request from IP ${req.ip}: key "${key}"`);
  },
});

/**
 * CORS configuration middleware
 */
const getCorsOptions = () => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:4200'];

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        logger.warn(`Blocked CORS request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
  };
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logMessage = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms - IP: ${req.ip}`;
    
    if (res.statusCode >= 400) {
      logger.error(logMessage);
    } else {
      logger.http(logMessage);
    }
  });
  
  next();
};

/**
 * Enforce HTTPS in production
 */
const enforceHTTPS = (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
};

module.exports = {
  helmetMiddleware,
  authRateLimiter,
  apiRateLimiter,
  uploadRateLimiter,
  sanitizeMiddleware,
  getCorsOptions,
  requestLogger,
  enforceHTTPS,
};
