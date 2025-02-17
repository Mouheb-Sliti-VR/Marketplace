require("dotenv").config();
const cors = require('cors');
const express = require("express");
const mongoose = require("mongoose");
const registerRoute = require("./Routes/AuthenticationRoute");
const latestMediaURLsRoute = require("./Routes/MediaRoute");
const ThreeDRoute = require ("./Routes/3dMediaRoute");
const path = require('path');  // Import path module

const app = express();

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // Enable CORS credentials (cookies, authorization headers, etc.)
};

app.use(cors(corsOptions));
app.use(express.json());

// Serve static files from the 'uploads' folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.DB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use("/auth", registerRoute);
app.use("/media", latestMediaURLsRoute);
app.use("/3d", ThreeDRoute);

app.get("/health-check", (req, res) => {
  res.status(200).send("up");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
