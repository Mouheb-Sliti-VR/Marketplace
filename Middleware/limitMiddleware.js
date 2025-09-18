const bytes = require('bytes');

const sizeLimiter = (maxSize = '50mb') => {
    return (req, res, next) => {
        const contentType = (req.get('content-type') || '').toLowerCase();

        // Skip multipart uploads and let multer enforce fileSize per-route
        if (contentType.includes('multipart/form-data')) {
            return next();
        }

        const contentLength = Number(req.get('content-length') || 0);
        if (contentLength && contentLength > bytes(maxSize)) {
            return res.status(413).json({
                error: 'Payload too large',
                maxSize: maxSize
            });
        }
        next();
    };
};

module.exports = { sizeLimiter };