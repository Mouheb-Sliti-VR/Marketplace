const Joi = require('joi');
const { body, param, query, validationResult } = require('express-validator');
const { ApiError } = require('../Middleware/errorHandler');

/**
 * Middleware to handle validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.param,
      message: err.msg,
    }));
    return next(new ApiError(400, 'Validation failed', true, JSON.stringify(errorMessages)));
  }
  next();
};

/**
 * Joi schemas for request validation
 */
const schemas = {
  // User registration schema
  register: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .lowercase()
      .trim()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
      }),
    companyName: Joi.string()
      .min(2)
      .max(100)
      .required()
      .trim()
      .messages({
        'string.min': 'Company name must be at least 2 characters long',
        'string.max': 'Company name cannot exceed 100 characters',
        'any.required': 'Company name is required',
      }),
    password: Joi.string()
      .min(8)
      .max(128)
      .required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required',
      }),
    address: Joi.string().max(200).optional().allow(''),
    zipCode: Joi.string().max(20).optional().allow(''),
    city: Joi.string().max(100).optional().allow(''),
    country: Joi.string().max(100).optional().allow(''),
  }),

  // User login schema
  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .lowercase()
      .trim()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required',
      }),
  }),

  // Profile update schema
  updateProfile: Joi.object({
    companyName: Joi.string().min(2).max(100).optional().trim(),
    address: Joi.string().max(200).optional().allow(''),
    zipCode: Joi.string().max(20).optional().allow(''),
    city: Joi.string().max(100).optional().allow(''),
    country: Joi.string().max(100).optional().allow(''),
  }),

  // Catalog validation schema
  validateOrder: Joi.object({
    selections: Joi.array()
      .items(
        Joi.object({
          offeringId: Joi.string().required(),
          selectedImagesCount: Joi.number().integer().min(0).max(4).optional(),
          selectedVideosCount: Joi.number().integer().min(0).max(2).optional(),
          selectedModelsCount: Joi.number().integer().min(0).max(1).optional(),
        })
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one selection is required',
        'any.required': 'Selections are required',
      }),
  }),
};

/**
 * Middleware factory for Joi schema validation
 */
const validateSchema = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return next(new ApiError(400, 'Validation failed', true, JSON.stringify(errorMessages)));
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

/**
 * Express-validator validation chains
 */
const validationChains = {
  // Registration validation
  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('companyName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Company name must be between 2 and 100 characters'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  ],

  // Login validation
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],

  // Catalog validation
  validateOrder: [
    body('selections')
      .isArray({ min: 1 })
      .withMessage('Selections must be a non-empty array'),
    body('selections.*.offeringId')
      .notEmpty()
      .withMessage('Offering ID is required'),
  ],
};

module.exports = {
  validate,
  validateSchema,
  schemas,
  validationChains,
};
