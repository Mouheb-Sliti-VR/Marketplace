// Models/threeDModel.js
const mongoose = require('mongoose');

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
    imageUrl: {
        type: String, // Store the image URL
        required: true, // Make image URL required
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

const ThreeDModel = mongoose.model('ThreeDModel', threeDModelSchema);
module.exports = ThreeDModel;
