// Models/threeDModel.js
const mongoose = require('mongoose');

// Define the schema for 3D models
const threeDModelSchema = new mongoose.Schema({
    type: {
        type: String,
        default: '3dmodel', // Default type for this model
        required: true,
    },
    filename: {
        type: String,
        required: true,
        unique: true, // Ensure filenames are unique
    },
    filepath: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Create a model from the schema
const ThreeDModel = mongoose.model('ThreeDModel', threeDModelSchema);

module.exports = ThreeDModel; // Export the model for use in other files
