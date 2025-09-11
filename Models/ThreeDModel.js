const mongoose = require('mongoose');

const threeDModelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    description: {
        type: String,
        trim: true,
    },
    imageUrl: {
        type: String,
        required: true,
    },
    modelData: {
        type: Buffer,
        required: true
    },
    filename: { 
        type: String, 
        required: true 
    },
    mimeType: {
        type: String,
        required: true
    }
}, { timestamps: true }); 

const ThreeDModel = mongoose.model('ThreeDModel', threeDModelSchema);
module.exports = ThreeDModel;
