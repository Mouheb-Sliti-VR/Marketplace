const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../Models/userModel");
const Media = require("../Models/mediaModel");
const { getMediaUrl } = require('../utils/urlConfig');
const axios = require('axios');
const FormData = require('form-data');
const { authenticateToken } = require('../Middleware/authMiddleware.js');
const { getLatestMediaURLsForUser, uploadFile, saveFileToDBAndUpdateUser } = require('../Controllers/fileHandler.js');
const { authRateLimiter } = require('../Middleware/securityMiddleware');
const { validateSchema, schemas } = require('../utils/validation');
const { asyncHandler } = require('../Middleware/errorHandler');
const logger = require('../utils/logger');

// Registration route with validation and rate limiting
router.post("/register", authRateLimiter, validateSchema(schemas.register), asyncHandler(async (req, res) => {
  logger.info("Register request received", { email: req.body.email });

  const { email, companyName, password, address, zipCode, city, country } = req.body;

  // Check if the email is already registered
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    logger.warn(`Registration failed: Email already exists`, { email });
    return res.status(400).json({ 
      status: 'error',
      message: "Email already exists" 
    });
  }

  // Hash password with 12 rounds for better security
  logger.debug(`Hashing password for user: ${email}`);
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  logger.debug(`Creating user with email: ${email}`);
  const user = new User({ 
    email, 
    companyName, 
    password: hashedPassword, 
    zipCode: zipCode || "", 
    country: country || "", 
    address: address || "", 
    city: city || "", 
  });
  await user.save();

  // Generate token after user registration
  const token = jwt.sign(
    { _id: user._id, email: user.email, companyName: user.companyName },
    process.env.SECRET_KEY,
    { expiresIn: '15d' }
  );

  logger.info(`User registered successfully`, { email, userId: user._id });
  res.status(201).json({ 
    status: 'success',
    message: "User registered successfully", 
    token,
    user: {
      email: user.email,
      companyName: user.companyName,
      zipCode: user.zipCode,
      country: user.country,
      address: user.address,
      city: user.city
    }
  });
}));

// Login route with validation and rate limiting
router.post("/login", authRateLimiter, validateSchema(schemas.login), asyncHandler(async (req, res) => {
  logger.info("Login request received", { email: req.body.email });

  const { email, password } = req.body;

  // Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    logger.warn(`Login failed: User not found`, { email });
    return res.status(401).json({ 
      status: 'error',
      message: "Invalid email or password" 
    });
  }

  logger.debug(`User found, verifying password`, { email });
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    logger.warn(`Login failed: Invalid password`, { email });
    return res.status(401).json({ 
      status: 'error',
      message: "Invalid email or password" 
    });
  }

  logger.debug(`Password verified, generating token`, { email });
  const token = jwt.sign(
    { _id: user._id, email: user.email, companyName: user.companyName },
    process.env.SECRET_KEY,
    { expiresIn: '15d' }
  );

  logger.info(`User logged in successfully`, { email, userId: user._id });

  return res.status(200).json({
    status: 'success',
    message: `${user.companyName} has successfully connected`,
    token,
    email: user.email,
    companyName: user.companyName,
    zipCode: user.zipCode,
    country: user.country,
    address: user.address,
    city: user.city
  });
}));

router.post("/updateProfile", authenticateToken, uploadFile, async (req, res) => {
  try {
    // Create new media for logo if present
    if (req.files?.logo?.[0]) {
      const logoFile = req.files.logo[0];
      const logoMedia = new Media({
        type: 'image',
        filename: logoFile.originalname,
        size: logoFile.size,
        mimeType: logoFile.mimetype,
        data: logoFile.buffer,
        user: req.user._id // Set the user ID from the authenticated request
      });
      await logoMedia.save();
    }
    // All updates will be handled by saveFileToDBAndUpdateUser
    const updatedData = await saveFileToDBAndUpdateUser(req);
    
    // Use the data structure returned by saveFileToDBAndUpdateUser
    res.json(updatedData);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: "Failed to update profile", details: error.message });
  }
});

router.get('/getUserDetails', authenticateToken, async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.email) {
      console.log("Unauthorized access: No user found in token");
      return res.status(401).json({ error: 'Unauthorized: No user found in token' });
    }

    // Retrieve the user details based on the authenticated email (or user ID)
    console.log('Fetching user details for:', req.user.email);
    const user = await User.findOne({ email: req.user.email })
      .populate({
        path: 'logo',
        model: 'Media'
      })
      .populate({
        path: 'images',
        model: 'Media'
      })
      .populate({
        path: 'videos',
        model: 'Media'
      })
      .populate({
        path: 'model3d',
        model: 'Media'
      });
    
    console.log('User found:', {
      id: user._id,
      hasLogo: !!user.logo,
      logoId: user.logo?._id,
      imagesCount: user.images?.length,
      videosCount: user.videos?.length,
      has3dModel: !!user.model3d
    });

    if (!user) {
      console.log("User not found for email: " + req.user.email);
      return res.status(404).json({ error: 'User not found.' });
    }

    // Log success
    console.log("Successfully retrieved user details for email: " + req.user.email);

    // Respond with user details
    res.json({
      user: {
        logo: user.logo ? getMediaUrl(user.logo.secureId) : null,
        images: user.images ? user.images.map(img => getMediaUrl(img.secureId)) : [],
        videos: user.videos ? user.videos.map(vid => getMediaUrl(vid.secureId)) : [],
        model3d: user.model3d ? getMediaUrl(user.model3d.secureId) : null,
        address: user.address,
        zipCode: user.zipCode,
        city: user.city,
        country: user.country,
        email: user.email,
        companyName: user.companyName
      }
    });
  } catch (error) {
    console.error("Error occurred while fetching user details:", error.message);
    res.status(500).json({ error: 'Failed to fetch user details', details: error.message });
  }
});


router.get("/usersWithPublishedFiles", async (req, res) => {
  try {
    console.log('Fetching users with published files...');
    
    // First, let's check if we have any users and media
    const userCount = await User.countDocuments();
    const mediaCount = await Media.countDocuments();
    
    console.log(`Database status - Users: ${userCount}, Media files: ${mediaCount}`);

    // Find users with media and populate their media references
    const users = await User.find({
      $or: [
        { 'images': { $exists: true, $ne: [] } },
        { 'videos': { $exists: true, $ne: [] } },
        { 'model3d': { $exists: true } },
        { 'logo': { $exists: true } }
      ]
    }).populate('logo images videos model3d');

    // Transform the users data to include media URLs
    const usersWithMedia = users.map(user => ({
      user: {
        logo: user.logo ? getMediaUrl(user.logo.secureId) : null,
        images: user.images ? user.images.map(img => getMediaUrl(img.secureId)) : [],
        videos: user.videos ? user.videos.map(vid => getMediaUrl(vid.secureId)) : [],
        model3d: user.model3d ? getMediaUrl(user.model3d.secureId) : null,
        address: user.address || '',
        zipCode: user.zipCode || '',
        city: user.city || '',
        country: user.country || '',
        email: user.email,
        companyName: user.companyName
      }
    }));

    console.log(`Found ${usersWithMedia.length} users with published files`);
    
    if (usersWithMedia.length === 0) {
      // Log the first few users in the database for debugging
      const sampleUsers = await User.find().limit(3).select('email companyName images videos model3d');
      console.log('Sample users in database:', JSON.stringify(sampleUsers, null, 2));
    }

    res.json({
      totalUsers: userCount,
      totalMedia: mediaCount,
      usersWithFiles: usersWithMedia
    });
  } catch (error) {
    console.error('Error fetching users with files:', error);
    console.error('Error details:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch users with files',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});


module.exports = router;
