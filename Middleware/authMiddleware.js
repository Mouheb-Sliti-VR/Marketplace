// authMiddleware.js
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const token = req.headers['authorization'].split(' ')[1];


    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        // Verify the token synchronously
        /*console.log('token : ',token);
        console.log('token : ',process.env.SECRET_KEY);
        console.log('decoded : ',decoded);
*/
        const decoded = jwt.verify(token, process.env.SECRET_KEY);

        // Check if token has expired
        if (decoded.exp <= Date.now() / 1000) {
            return res.status(401).json({ error: 'Access token expired.' });
        }
        // Proceed to the next middleware if the token is valid
        req.user = decoded;
        next();
    } catch (err) {
        console.error('JWT verification error:', err);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Access token expired.' });
        }
        return res.status(403).json({ error: 'Invalid token.' });
    }
}

module.exports = authenticateToken;
