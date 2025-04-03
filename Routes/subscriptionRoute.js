// routes/subscriptionRoute.js
const express = require('express');
const router = express.Router();
const { createSubscription,getUserSubscriptions } = require('../Controllers/subscriptionController');
const { authenticateToken } = require('../Middleware/authMiddleware');

// Route to create a subscription
router.post('/subscribe', authenticateToken, createSubscription);

// Route to get user subscriptions
router.get('/getUserSubs', authenticateToken, getUserSubscriptions);


module.exports = router;
