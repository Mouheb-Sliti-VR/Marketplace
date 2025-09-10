const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../Models/userModel");
const Media = require("../Models/mediaModel");
const { getMediaUrl } = require('../utils/urlConfig');
const validator = require('validator');
const axios = require('axios');
const FormData = require('form-data');
const {authenticateToken} = require ('../Middleware/authMiddleware.js');
const { getLatestMediaURLsForUser,uploadFile,saveFileToDBAndUpdateUser } = require('../Controllers/fileHandler.js'); 

// Registration route
router.post("/register", async (req, res) => {
  try {
    console.log("Register request received:", req.body);

    const { email, companyName, password } = req.body;

    // Validate email format using regular expression or a validator library
    if (!validator.isEmail(email)) {
      console.warn(`Registration failed: Invalid email format: ${email}`);
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Check if the email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.warn(`Registration failed: Email '${email}' already exists.`);
      return res.status(400).json({ message: "Email already exists" });
    }

    // Ensure that password is provided and has a minimum length
    if (!password) {
      console.warn("Registration failed: Password is missing.");
      return res.status(400).json({ message: "Password is required" });
    }

    if (password.length < 6) {
      console.warn(`Registration failed: Password '${password}' is too short.`);
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    console.log(`Hashing password for user: ${email}`);
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    console.log(`Creating user with email: ${email}`);
    const user = new User({ 
      email, 
      companyName, 
      password: hashedPassword, 
      zipCode:"", 
      country:"", 
      address:"", 
      city:"", 
    });
    await user.save();

    // Generate token after user registration
    const token = jwt.sign(
      { _id: user._id, email: user.email, companyName: user.companyName },
      process.env.SECRET_KEY,
      { expiresIn: '2w' } // Optional: Token expiration time
    );

    console.info(`User registered successfully: ${email}`);
    res.status(201).json({ 
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
  } catch (error) {
    console.error("Registration failed with error:", error);
    res.status(500).json({ message: "Registration failed" });
  }
});

// Login route
router.post("/login", async (req, res) => {
  try {
      console.log("Login request received:", req.body);
      const { email, password } = req.body;

      console.log(`Looking up user with email: ${email}`);
      const user = await User.findOne({ email });

      if (!user) {
          console.warn(`Login failed: User with email '${email}' not found.`);
          return res.status(401).send("Invalid email or password");
      }

      console.log(`User found: ${user.email}, verifying password.`);
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
          console.warn(`Login failed: Invalid password for user '${email}'.`);
          return res.status(401).send("Invalid email or password");
      }

      console.log(`Password verified for user: ${email}. Generating token.`);
      const token = jwt.sign(
          { _id: user._id, email: user.email, companyName: user.companyName },
          process.env.SECRET_KEY,
          { expiresIn: '2w' } // Optional: Token expiration time
      );

    // Log all relevant information
    console.info(`User logged in successfully: ${email}`);
    console.info(`Company Name: ${user.companyName}`);
    console.info(`Token: ${token}`);
    console.info(`Zip Code: ${user.zipCode}`);
    console.info(`Country: ${user.country}`);
    console.info(`Address: ${user.address}`);
    console.info(`City: ${user.city}`);

    // Send response with all relevant information
    return res.status(200).send({
      message: `${user.companyName} has successfully connected with this token`,
      token,
      email: user.email,
      companyName: user.companyName,
      zipCode: user.zipCode,
      country: user.country,
      address: user.address,
      city: user.city
    });

  } catch (error) {
      console.error("Login failed with error:", error);
      return res.status(500).send("Login failed");
  }
});

router.post("/updateProfile", authenticateToken, uploadFile, async (req, res) => {
  try {
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
    // Find all users who have media files
    const usersWithMedia = await User.aggregate([
      {
        $lookup: {
          from: 'media',
          localField: 'email',
          foreignField: 'userEmail',
          as: 'mediaFiles'
        }
      },
      {
        $match: {
          'mediaFiles.0': { $exists: true } // Only users with at least one media file
        }
      },
      {
        $project: {
          _id: 1,
          email: 1,
          companyName: 1,
          mediaCount: { $size: '$mediaFiles' }
        }
      }
    ]);

    res.json(usersWithMedia);
  } catch (error) {
    console.error('Error fetching users with files:', error);
    res.status(500).json({ error: 'Failed to fetch users with files' });
  }
});


module.exports = router;
