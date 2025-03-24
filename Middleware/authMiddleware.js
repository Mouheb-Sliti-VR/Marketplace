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

/* Middleware to authenticate the user using JWT
const authenticateJWT = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Extract token from Authorization header
  if (!token) {
    console.warn("Authentication failed: No token provided.");
    return res.sendStatus(403); // Forbidden
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      console.warn("Authentication failed: Invalid token.");
      return res.sendStatus(403); // Forbidden
    }
    req.user = user; // Attach user info to the request
    console.info(`User authenticated: ${user.email}`);
    next();
  });
};
*/


module.exports = authenticateToken;
