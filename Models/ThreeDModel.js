const mongoose = require('mongoose');

const threeDModelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
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
    },

    filename: { type: String, required: true }, 

}, { timestamps: true }); 

const ThreeDModel = mongoose.model('ThreeDModel', threeDModelSchema);
module.exports = ThreeDModel;
