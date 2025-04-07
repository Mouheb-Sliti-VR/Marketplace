const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../Models/userModel");
const Media = require("../Models/mediaModel");
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
      balance: 500, 
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
      token, // Include the token in the response
      user: {
        email: user.email,
        companyName: user.companyName,
        balance: user.balance,
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
      console.info(`Balance: ${user.balance}`);
      console.info(`Zip Code: ${user.zipCode}`);
      console.info(`Country: ${user.country}`);
      console.info(`Address: ${user.address}`);
      console.info(`City: ${user.city}`);

      // Send response with all relevant information
      return res.status(200).send({
          message: `${user.companyName} has successfully connected with this token`,
          token,
          balance: user.balance,
          email: user.email, // Include email in the response if needed
          companyName: user.companyName, // Include company name in the response if needed
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
    const { address, zipCode, city, country } = req.body;

    // Validate required fields
    if (!address || !zipCode || !city || !country) {
      return res.status(400).json({ error: 'All fields (address, zipCode, city, country) are required.' });
    }

    let user;

    // Check for uploaded file
    if (req.file) {
      user = await saveFileToDBAndUpdateUser(req, 'logo');
    } else {
      user = await User.findOne({ email: req.user.email }).populate('logo');
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
    }

    // Update user profile fields
    Object.assign(user, { address, zipCode, city, country });

    // Save the updated user
    await user.save();

    // Respond with updated user information
    res.json({
      message: "Profile updated successfully",
      user: {
        logo: user.logo ? `https://marketplace-1-5g2u.onrender.com/media/${user.logo.secureId}` : null,
        address: user.address,
        zipCode: user.zipCode,
        city: user.city,
        country: user.country,
      }
    });
  } catch (error) {
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
    const user = await User.findOne({ email: req.user.email })
      .populate('logo')  // Populate the 'logo' media
      .populate('image1') // Optionally populate other media (if needed)
      .populate('image2') // Optionally populate other media (if needed)
      .populate('video'); // Optionally populate video media (if needed)

    if (!user) {
      console.log("User not found for email: " + req.user.email);
      return res.status(404).json({ error: 'User not found.' });
    }

    // Log success
    console.log("Successfully retrieved user details for email: " + req.user.email);

    // Respond with user details
    res.json({
      user: {
        logo: user.logo ? `https://marketplace-1-5g2u.onrender.com/media/${user.logo.secureId}` : null,
        image1: user.image1 ? `https://marketplace-1-5g2u.onrender.com/media/${user.image1.secureId}` : null,
        image2: user.image2 ? `https://marketplace-1-5g2u.onrender.com/media/${user.image2.secureId}` : null,
        video: user.video ? `https://marketplace-1-5g2u.onrender.com/media/${user.video.secureId}` : null,
        address: user.address,
        zipCode: user.zipCode,
        city: user.city,
        country: user.country,
        email: user.email,
        companyName: user.companyName,
        balance: user.balance,
      }
    });
  } catch (error) {
    console.error("Error occurred while fetching user details:", error.message);
    res.status(500).json({ error: 'Failed to fetch user details', details: error.message });
  }
});


router.get("/usersWithPublishedFiles", async (req, res) => {
  try {
    // Find users who have at least one media field populated
    const usersWithFiles = await User.find({
      $or: [
        { image1: { $exists: true } },
        { image2: { $exists: true } },
        { video: { $exists: true } },
        { logo: { $exists: true } },
      ],
    });

    // Total number of partners with uploaded files
    const totalPartners = usersWithFiles.length;

    // Fetch media URLs using secureId for each user and include balance
    const usersWithUrls = await Promise.all(usersWithFiles.map(async (user) => {
      const mediaUrls = await getLatestMediaURLsForUser(user.email); // Uses secureId-based URLs
      console.log("Media URLs for user:", mediaUrls); 
      

      return {
        email: user.email,
        companyName: user.companyName,
        balance: user.balance, 
        Logo: mediaUrls.Logo,   
        Image1: mediaUrls.Image1,
        Image2: mediaUrls.Image2,
        Video: mediaUrls.Video
      };
    }));

    // Construct the response object
    res.json({ users: usersWithUrls, totalPartners });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Route to show user's balance
router.post("/show-balance", async (req, res) => {
  try {
    // Log only important information
    const companyName = req.body.companyName;
    console.log("Incoming request:", companyName);

    if (!companyName) {
      return res.status(400).json({ error: "Partner name is required" });
    }

    const user = await User.findOne({ companyName });
    if (!user) {
      return res.status(404).json({ error: "Partner not found" });
    }

    // Log only email and balance
    console.log("Partner found: Name:", user.companyName, "balance:", user.balance);

    res.json({ balance: user.balance });
  } catch (error) {
    console.error("Error in /show-balance:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Route to add more balance to user's account
router.post("/add-balance", async (req, res) => {
  try {
    const { email, amount } = req.body;
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send("User not found");
    }
    // Add balance
    user.balance += amount;
    await user.save();
    res.json({ message: "Balance added successfully", balance: user.balance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Route to decrease balance from user's account
router.post("/decrease-balance", async (req, res) => {
  try {
    const { companyName, amount } = req.body;
    // Find user by email
    const user = await User.findOne({ companyName });
    if (!user) {
      return res.status(404).send("User not found");
    }
    // Check if user has sufficient balance
    if (user.balance < amount) {
      return res.status(400).send("Insufficient balance");
    }
    // Decrease balance
    user.balance -= amount;
    await user.save();
    res.json({ message: "Balance decreased successfully", balance: user.balance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
