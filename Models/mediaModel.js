// mediaModel.js
const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
    type: String,
    filename: String,
    data: Buffer, // Field to store binary file data
    createdAt: { type: Date, default: Date.now }
});

const Media = mongoose.model('Media', mediaSchema);

module.exports = Media;
