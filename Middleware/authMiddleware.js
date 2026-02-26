// authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../Models/userModel');
const logger = require('../utils/logger');

async function authenticateToken(req, res, next) {
    const bearerHeader = req.headers['authorization'];
    
    if (!bearerHeader) {
        logger.warn('Authentication failed: No token provided', { ip: req.ip });
        return res.status(401).json({ 
            status: 'error',
            error: 'No token provided' 
        });
    }

    const token = bearerHeader.split(' ')[1];
    if (!token) {
        logger.warn('Authentication failed: Invalid token format', { ip: req.ip });
        return res.status(401).json({ 
            status: 'error',
            error: 'Invalid token format' 
        });
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        
        // Get full user data from database
        const user = await User.findById(decoded._id)
            .select('-password') // Exclude password from the result
            .populate('logo')
            .populate('images')
            .populate('videos')
            .populate('model3d');

        if (!user) {
            logger.warn('Authentication failed: User not found', { userId: decoded._id });
            return res.status(401).json({ 
                status: 'error',
                error: 'User not found' 
            });
        }

        // Attach both the decoded token and full user data to the request
        req.token = token;
        req.user = user;

        next();
    } catch (err) {
        logger.error('Token verification error', { error: err.message, ip: req.ip });
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                status: 'error',
                error: 'Access token expired' 
            });
        }
        return res.status(401).json({ 
            status: 'error',
            error: 'Invalid token' 
        });
    }
}

function generateToken(user) {
  return jwt.sign(
      { _id: user._id, email: user.email, companyName: user.companyName },
      process.env.SECRET_KEY,
      { expiresIn: '15d' }
  );
}

module.exports = { authenticateToken, generateToken };


