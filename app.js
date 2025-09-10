require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const registerRoute = require("./Routes/AuthenticationRoute");
const mediaRoute = require("./Routes/MediaRoute");
const ThreeDRoute = require("./Routes/3dMediaRoute");
const catalogRoute = require("./Routes/catalogRoute");


// Define base API path first
const API_BASE_PATH = process.env.NODE_ENV === 'production' ? '/api' : '';

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.DB_URI;

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

// Serve static files from uploads directory
app.use(`${API_BASE_PATH}/uploads`, express.static(path.join(__dirname, 'uploads')));

// Error handling for static files
app.use(`${API_BASE_PATH}/uploads`, (err, req, res, next) => {
    console.error('Static file error:', err);
    res.status(404).json({ error: 'File not found' });
});

// MongoDB Connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Routes
app.use(`${API_BASE_PATH}/auth`, registerRoute);
app.use(`${API_BASE_PATH}/media`, mediaRoute);
app.use(`${API_BASE_PATH}/3d`, ThreeDRoute);
app.use(`${API_BASE_PATH}/catalog`, catalogRoute);

// Health Check Route
app.get("/health-check", (req, res) => res.status(200).json({ status: "up", timestamp: new Date() }));

// Start Server
app.listen(PORT, () => console.log(`🚀 Marketplace running on http://localhost:${PORT}`));
