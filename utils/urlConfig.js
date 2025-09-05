const BASE_DOMAIN = 'https://marketplace-vr.onrender.com';
const API_PREFIX = process.env.NODE_ENV === 'production' ? '/api' : '';

const getMediaUrl = (secureId) => `${BASE_DOMAIN}${API_PREFIX}/media/${secureId}`;
const getBaseUrl = () => `${BASE_DOMAIN}${API_PREFIX}`;

module.exports = {
    BASE_DOMAIN,
    API_PREFIX,
    getMediaUrl,
    getBaseUrl
};
