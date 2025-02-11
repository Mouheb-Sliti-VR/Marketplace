// Models/threeDModel.js
const mongoose = require('mongoose');

// Define the schema for 3D models
const threeDModelSchema = new mongoose.Schema({
    type: {
        type: String,
        default: '3dmodel', // Default type for this model
        required: true,
    },
    name: {
        type: String,
        required: true,
        trim: true, // Ensures no extra spaces
    },
    filename: {
        type: String,
        required: true,
        unique: true, 
    },
    filepath: {
        type: String,
        required: true,
    },
    image: {
        type: String, // Store the image URL or base64 string
        required: false,
    },
    description: {
        type: String,
        required: false,
        trim: true, // Removes extra whitespace
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Create a model from the schema
const ThreeDModel = mongoose.model('ThreeDModel', threeDModelSchema);

module.exports = ThreeDModel; // Export the model for use in other files
