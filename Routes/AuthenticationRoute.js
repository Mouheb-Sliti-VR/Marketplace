const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../Models/userModel");
const Media = require("../Models/mediaModel");
const validator = require('validator');
const { getLatestMediaURLsForUser } = require('../Controllers/fileHandler.js'); 


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
    const user = new User({ email, companyName, password: hashedPassword, balance:500});
    await user.save();

    console.info(`User registered successfully: ${email}`);
    res.status(201).json({ message: "User registered successfully" });
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
          { email: user.email, companyName: user.companyName },
          process.env.SECRET_KEY,
          { expiresIn: '2w' } // Optional: Token expiration time
      );

      // Log all relevant information
      console.info(`User logged in successfully: ${email}`);
      console.info(`Company Name: ${user.companyName}`);
      console.info(`Token: ${token}`);
      console.info(`Balance: ${user.balance}`);

      // Send response with all relevant information
      res.send({
          message: `${user.companyName} has successfully connected with this token`,
          token,
          balance: user.balance,
          email: user.email, // Include email in the response if needed
          companyName: user.companyName // Include company name in the response if needed
      });
  } catch (error) {
      console.error("Login failed with error:", error);
      res.status(500).send("Login failed");
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
