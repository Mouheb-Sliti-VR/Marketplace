const BASE_DOMAIN = 'https://marketplace-vr.onrender.com';
const API_PREFIX = '/api'; // Always include /api for consistency

const getMediaUrl = (secureId) => `${BASE_DOMAIN}${API_PREFIX}/media/${secureId}`;
const getBaseUrl = () => `${BASE_DOMAIN}${API_PREFIX}`;

module.exports = {
    BASE_DOMAIN,
    API_PREFIX,
    getMediaUrl,
    getBaseUrl
};
