const express = require('express');
const router = express.Router();
const { getCatalogItems, validateOrder, confirmOrder, getSubscriptions } = require('../services/catalogService');
const { authenticateToken } = require('../Middleware/authMiddleware');

// Route to get all catalog items
router.get('/items', async (req, res) => {
    try {
        const items = await getCatalogItems();
        res.json(items);
    } catch (error) {
        console.error('Error fetching catalog items:', error);
        res.status(500).json({ error: 'Failed to fetch catalog items' });
    }
});

// Route to validate an order
router.post('/validate', authenticateToken, async (req, res) => {
    try {
        const { selections } = req.body;
        
        // Check if selections array exists and has at least one item
        if (!selections || !Array.isArray(selections) || selections.length === 0) {
            return res.status(400).json({ 
                error: 'Invalid request body. Required: selections array with at least one item' 
            });
        }

        // Get the first selection (we currently only support one selection)
        const selection = selections[0];
        if (!selection.offeringId) {
            return res.status(400).json({ 
                error: 'Invalid selection. Required: offeringId' 
            });
        }

        const selectedOfferId = selection.offeringId;
        const selectedImagesCount = selection.selectedImagesCount;
        const selectedVideosCount = selection.selectedVideosCount;
        const selectedModelsCount = selection.selectedModelsCount;

        // Get offer type from the ID
        const offerType = selectedOfferId.split('_')[0].toUpperCase();
        
        // Validate based on offer type
        switch(offerType) {
            case 'IMG':
                if (!selectedImagesCount) {
                    return res.status(400).json({ 
                        error: 'For image offers, selectedImagesCount is required' 
                    });
                }
                break;
            case 'VID':
                if (!selectedVideosCount) {
                    return res.status(400).json({ 
                        error: 'For video offers, selectedVideosCount is required' 
                    });
                }
                break;
            case 'MODEL':
                if (!selectedModelsCount) {
                    return res.status(400).json({ 
                        error: 'For 3D model offers, selectedModelsCount is required' 
                    });
                }
                break;
            case 'MIXED':
                if (!selectedImagesCount && !selectedVideosCount) {
                    return res.status(400).json({ 
                        error: 'For mixed offers, at least one of selectedImagesCount or selectedVideosCount is required' 
                    });
                }
                break;
            default:
                return res.status(400).json({ 
                    error: 'Invalid offer type' 
                });
        }

        // Create validation data keeping the original selections format
        const validationData = {
            selections: [{
                offeringId: selectedOfferId,
                ...(selectedImagesCount && { selectedImagesCount: parseInt(selectedImagesCount, 10) }),
                ...(selectedVideosCount && { selectedVideosCount: parseInt(selectedVideosCount, 10) }),
                ...(selectedModelsCount && { selectedModelsCount: parseInt(selectedModelsCount, 10) })
            }]
        };

        // Forward the token from the authenticated request
        const validationResult = await validateOrder(validationData, req.token);
        res.json(validationResult);
    } catch (error) {
        console.error('Error validating order:', error);
        res.status(error.response?.status || 500).json({ 
            error: error.message || 'Failed to validate order' 
        });
    }
});

// Route to confirm an order
router.post('/confirm', authenticateToken, async (req, res) => {
    try {
        const { quoteId } = req.body;
        
        // Validate required fields
        if (!quoteId) {
            return res.status(400).json({ 
                error: 'Invalid request body. Required: quoteId' 
            });
        }

        // Make sure we have a token
        if (!req.token) {
            return res.status(401).json({ error: 'No authentication token provided' });
        }

        // Ensure the token is properly formatted with 'Bearer'
        const token = req.token.startsWith('Bearer ') ? req.token : `Bearer ${req.token}`;
        
        // Forward the token from the authenticated request
        const confirmationResult = await confirmOrder({ quoteId }, token);
        res.json(confirmationResult);
    } catch (error) {
        console.error('Error confirming order:', error);
        // Send a more detailed error response
        res.status(error.response?.status || 500).json({ 
            error: 'Failed to confirm order',
            details: error.message,
            ...(error.response?.data && { responseData: error.response.data })
        });
    }
});

// Route to get subscriptions
router.get('/subscriptions', authenticateToken, async (req, res) => {
    try {
        if (!req.token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Get the token without 'Bearer ' prefix if it exists
        const token = req.token.replace('Bearer ', '');
        
        // Forward the cleaned token from the authenticated request
        const subscriptions = await getSubscriptions(token);
        res.json(subscriptions);
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(error.response?.status || 500).json({ 
            error: error.message || 'Failed to fetch subscriptions' 
        });
    }
});

module.exports = router;
