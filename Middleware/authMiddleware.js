// authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../Models/userModel');

async function authenticateToken(req, res, next) {
    const bearerHeader = req.headers['authorization'];
    
    if (!bearerHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = bearerHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Invalid token format' });
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
            return res.status(401).json({ error: 'User not found' });
        }

        // Attach both the decoded token and full user data to the request
        req.token = token;
        req.user = user;

        next();
    } catch (err) {
        console.error('Token verification error:', err);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Access token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
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


