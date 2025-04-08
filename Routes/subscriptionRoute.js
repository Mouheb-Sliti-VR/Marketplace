// routes/subscriptionRoute.js
const express = require('express');
const router = express.Router();
const { createSubscription,getUserSubscriptions } = require('../Controllers/subscriptionController');
const { authenticateToken } = require('../Middleware/authMiddleware');

// Route to create a subscription
router.post('/subscribe', authenticateToken, createSubscription);

// Route to get user subscriptions
router.get('/getUserSubs', authenticateToken, async (req, res) => {
    try {
        const userInfo = await getUserSubscriptions(req);
        res.json({ user: userInfo });
      } catch (error) {
        console.error("Error occurred while fetching user information:", error.message);
        res.status(500).json({ error: error.message });
      }
});


module.exports = router;
