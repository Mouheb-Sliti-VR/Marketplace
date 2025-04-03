// authMiddleware.js
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.SECRET_KEY);

        // Attach the decoded token (user information) to the request object
        req.user = decoded;

        // Proceed to the next middleware if the token is valid
        next();
    } catch (err) {
        console.error('JWT verification error:', err);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Access token expired.' });
        }
        return res.status(403).json({ error: 'Invalid token.' });
    }
}

function generateToken(user) {
  return jwt.sign(
      { _id: user._id, email: user.email, companyName: user.companyName }, // Ensure `_id` is included
      process.env.SECRET_KEY,
      { expiresIn: '15d' } // Set token expiration
  );
}

module.exports = { authenticateToken, generateToken };


