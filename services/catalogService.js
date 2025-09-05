const axios = require('axios');
require("dotenv").config();

/**
 * Standardized logging function for catalog service
 * @param {string} level - Log level (info, error)
 * @param {string} action - Action being performed
 * @param {Object} [data] - Optional data to log
 */
const log = (level, action, data = {}) => {
    const message = {
        service: 'Catalog',
        action,
        timestamp: new Date().toISOString(),
        ...data
    };
    if (level === 'error') {
        console.error(message);
    } else {
        console.log(message);
    }
};

async function getCatalogItems() {
    try {
        const response = await axios.get(process.env.CATALOG_API_URL);
        return response.data;
    } catch (error) {
        log('error', 'FetchCatalog', { error: error.message });
        throw new Error('Failed to fetch catalog items');
    }
}

async function getOfferById(offerId) {
    const items = await getCatalogItems();
    return items.find(item => item.id === offerId);
}

/**
 * Validates an order with the selections
 * @param {Object} data - The order data from the frontend
 * @param {Array} data.selections - Array of selections
 * @param {string} data.selections[].offeringId - The ID of the selected offer
 * @param {number} [data.selections[].selectedImagesCount] - Number of images selected
 * @param {number} [data.selections[].selectedVideosCount] - Number of videos selected
 * @param {number} [data.selections[].selectedModelsCount] - Number of 3D models selected
 * @param {string} authToken - The authentication token
 * @returns {Promise<Object>} The validation response including quoteId
 */
async function validateOrder(data, authToken) {
    try {
        if (!data.selections || !Array.isArray(data.selections) || data.selections.length === 0) {
            throw new Error('Invalid request format: selections array is required');
        }

        const selection = data.selections[0];
        if (!selection.offeringId) {
            throw new Error('Invalid selection: offeringId is required');
        }

        // Debug logging
        console.log('Validating selection:', {
            offeringId: selection.offeringId,
            fullSelection: selection
        });

        let offerType;
        // Log each check
        console.log('Checking offer type:', {
            isIMG: selection.offeringId.startsWith('IMG_ADS_OFFER_'),
            isVIDEO: selection.offeringId.startsWith('VIDEO_ADS_OFFER_'),
            is3D: selection.offeringId.startsWith('3D_MODEL_ADS_OFFER_'),
            isMIXED: selection.offeringId.startsWith('MIXED_ADS_OFFER_')
        });

        if (selection.offeringId.startsWith('IMG_ADS_OFFER_')) {
            offerType = 'IMG';
        } else if (selection.offeringId.startsWith('VIDEO_ADS_OFFER_')) {
            offerType = 'VIDEO';
        } else if (selection.offeringId.startsWith('3D_MODEL_ADS_OFFER_')) {
            offerType = '3D_MODEL';
        } else if (selection.offeringId.startsWith('MIXED_ADS_OFFER_')) {
            offerType = 'MIXED';
        } else {
            throw new Error('Invalid offer type');
        }

        // Validate counts based on offer type
        switch(offerType) {
            case 'IMG':
                if (selection.selectedImagesCount > 4) {
                    throw new Error('Image count cannot exceed 4');
                }
                break;

            case 'VIDEO':
                if (selection.selectedVideosCount > 2) {
                    throw new Error('Video count cannot exceed 2');
                }
                break;

            case '3D_MODEL':
                if (selection.selectedModelsCount > 1) {
                    throw new Error('3D Model count cannot exceed 1');
                }
                break;

            case 'MIXED':
                if (selection.selectedImagesCount > 4) {
                    throw new Error('Image count cannot exceed 4');
                }
                if (selection.selectedVideosCount > 2) {
                    throw new Error('Video count cannot exceed 2');
                }
                break;

            default:
                throw new Error('Invalid offer type');
        }

        // We can just pass through the selections array as is since it's already in the correct format
        const orderData = {
            selections: data.selections
        };

        // Log the exact payload being sent to the API
        log('info', 'ValidateOrder', { 
            payload: orderData,
            offerType
        });

        const cleanToken = authToken.replace('Bearer ', '');
        const token = `Bearer ${cleanToken}`;

        const response = await axios.post(
            process.env.VALIDATE_URL,
            orderData,
            {
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            }
        );

        log('info', 'ValidateOrderSuccess', { 
            quoteId: response.data.quoteId,
            price: response.data.price
        });
        
        return response.data;
    } catch (error) {
        log('error', 'ValidateOrderFailed', { 
            error: error.response?.data?.error || error.message,
            offerId: data.selectedOfferId
        });
        throw new Error(error.response?.data?.error || 'Order validation failed');
    }
}

/**
 * Confirms an order using the quoteId received from validation
 * @param {Object} data - The confirmation data
 * @param {string} data.quoteId - The quote ID received from the validation step
 * @param {string} authToken - The authentication token
 * @returns {Promise<Object>} The confirmation response
 */
async function confirmOrder(data, authToken) {
    try {
        if (!data?.quoteId) {
            throw new Error('Quote ID is required for confirmation');
        }

        const cleanToken = authToken.replace('Bearer ', '');
        const token = `Bearer ${cleanToken}`;

        log('info', 'ConfirmOrder', { quoteId: data.quoteId });

        const response = await axios.post(
            process.env.CONFIRM_URL,
            { quoteId: data.quoteId },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                }
            }
        );

        if (!response.data) {
            throw new Error('No response data received from confirmation endpoint');
        }

        log('info', 'ConfirmOrderSuccess', { 
            orderId: response.data.orderId,
            subscriptionId: response.data.subscription?.id,
            status: response.data.subscription?.status
        });

        return response.data;
    } catch (error) {
        log('error', 'ConfirmOrderFailed', { 
            error: error.response?.data?.error || error.message,
            quoteId: data.quoteId
        });
        throw new Error(error.response?.data?.error || error.message || 'Order confirmation failed');
    }
}

/**
 * Gets the subscription information
 * @param {string} authToken - The authentication token
 * @returns {Promise<Object>} The subscription information
 */
async function getSubscriptions(authToken) {
    try {
        log('info', 'FetchSubscriptions');
        
        const response = await axios.get(
            process.env.SUBSCRIBE_URL,
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        );

        log('info', 'FetchSubscriptionsSuccess', {
            count: response.data.subscriptions?.length || 0
        });

        return response.data;
    } catch (error) {
        log('error', 'FetchSubscriptionsFailed', { 
            error: error.response?.data?.error || error.message 
        });
        throw new Error(error.response?.data?.error || 'Failed to fetch subscriptions');
    }
}

module.exports = {
    getCatalogItems,
    getOfferById,
    validateOrder,
    confirmOrder,
    getSubscriptions
};
