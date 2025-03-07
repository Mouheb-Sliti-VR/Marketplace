require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const registerRoute = require("./Routes/AuthenticationRoute");
const latestMediaURLsRoute = require("./Routes/MediaRoute");
const ThreeDRoute = require("./Routes/3dMediaRoute");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.DB_URI;

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); 

// MongoDB Connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Routes
app.use("/auth", registerRoute);
app.use("/media", latestMediaURLsRoute);
app.use("/3d", ThreeDRoute);

// Health Check Route
app.get("/health-check", (req, res) => res.status(200).json({ status: "up", timestamp: new Date() }));

// Start Server
app.listen(PORT, () => console.log(`🚀 Marketplace running on http://localhost:${PORT}`));
