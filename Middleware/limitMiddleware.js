const bytes = require('bytes');

const sizeLimiter = (maxSize = '50mb') => {
    return (req, res, next) => {
        const contentLength = req.get('content-length');
        if (contentLength > bytes(maxSize)) {
            return res.status(413).json({
                error: 'Payload too large',
                maxSize: maxSize
            });
        }
        next();
    };
};

module.exports = { sizeLimiter };