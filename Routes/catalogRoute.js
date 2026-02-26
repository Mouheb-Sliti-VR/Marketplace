const express = require('express');
const router = express.Router();
const { getCatalogItems, validateOrder, confirmOrder, getSubscriptions } = require('../services/catalogService');
const { authenticateToken } = require('../Middleware/authMiddleware');
const { validateSchema, schemas } = require('../utils/validation');
const { asyncHandler } = require('../Middleware/errorHandler');
const { apiRateLimiter } = require('../Middleware/securityMiddleware');
const logger = require('../utils/logger');

// Apply rate limiting to all catalog routes
router.use(apiRateLimiter);

// Route to get all catalog items
router.get('/items', asyncHandler(async (req, res) => {
    const items = await getCatalogItems();
    res.json({
        status: 'success',
        data: items
    });
}));

// Route to validate an order with proper validation
router.post('/validate', authenticateToken, validateSchema(schemas.validateOrder), asyncHandler(async (req, res) => {
    const { selections } = req.body;
    
    logger.info('Order validation request', { 
        userId: req.user._id, 
        offeringId: selections[0]?.offeringId 
    });
    
    const result = await validateOrder(req.body, req.headers.authorization);
    
    logger.info('Order validated successfully', { 
        userId: req.user._id, 
        quoteId: result.quoteId 
    });
    
    res.json({
        status: 'success',
        data: result
    });
}));

// Route to confirm an order
router.post('/confirm', authenticateToken, asyncHandler(async (req, res) => {
    const { quoteId } = req.body;
    
    if (!quoteId) {
        return res.status(400).json({ 
            status: 'error',
            error: 'Invalid request body. Required: quoteId' 
        });
    }

    logger.info('Order confirmation request', { userId: req.user._id, quoteId });

    const token = req.token.startsWith('Bearer ') ? req.token : `Bearer ${req.token}`;
    const confirmationResult = await confirmOrder({ quoteId }, token);
    
    logger.info('Order confirmed successfully', { userId: req.user._id, quoteId });
    
    res.json({
        status: 'success',
        data: confirmationResult
    });
}));

// Route to get subscriptions
router.get('/subscriptions', authenticateToken, asyncHandler(async (req, res) => {
    logger.info('Fetching subscriptions', { userId: req.user._id });
    
    const token = req.token.replace('Bearer ', '');
    const subscriptions = await getSubscriptions(token);
    
    res.json({
        status: 'success',
        data: subscriptions
    });
}));

module.exports = router;
