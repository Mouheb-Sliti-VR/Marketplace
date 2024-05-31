const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../Models/userModel");
const Media = require("../Models/mediaModel");

// Registration route
router.post("/register", async (req, res) => {
  try {
    const { email, companyName, password } = req.body;

    // Check if the email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Ensure that password is provided
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    // Generate salt rounds
    const saltRounds = 10;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = new User({ email, companyName, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Registration failed" });
  }
});

// Login route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).send("Invalid email or password");
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send("Invalid email or password");
    }

    // Generate JWT token
    const token = jwt.sign(
      { email: user.email, companyName: user.companyName },
      process.env.SECRET_KEY
    );
    res.send({
      message: `${user.companyName} has successfully connected with this token`,
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Login failed");
  }
});

// Route to get users with published files
router.get("/usersWithPublishedFiles", async (req, res) => {
  try {
    // Find users who have at least one of the media fields populated
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

    // Simplify the user data and construct media URLs
    const usersWithUrls = await Promise.all(usersWithFiles.map(async user => {
      const image1Url = user.image1 ? `http://localhost:3000/media/${await getMediaFilename(user.image1)}` : null;
      const image2Url = user.image2 ? `http://localhost:3000/media/${await getMediaFilename(user.image2)}` : null;
      const videoUrl = user.video ? `http://localhost:3000/media/${await getMediaFilename(user.video)}` : null;
      const logoUrl = user.logo ? `http://localhost:3000/media/${await getMediaFilename(user.logo)}` : null;

      return { image1Url, image2Url, videoUrl, logoUrl };
    }));

    // Construct the response object
    const response = {
      users: usersWithUrls,
      totalPartners
    };

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Function to get media filename from the media ID
async function getMediaFilename(mediaId) {
  const media = await Media.findById(mediaId);
  return media ? media.filename : null;
}

module.exports = router;
