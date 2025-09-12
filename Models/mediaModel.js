const mongoose = require('mongoose');
const crypto = require('crypto');

const mediaSchema = new mongoose.Schema({
  secureId: { 
    type: String, 
    required: true, 
    unique: true, 
    default: () => crypto.randomBytes(16).toString('hex')
  },
  type: { 
    type: String, 
    enum: ['image', 'video', 'model'], 
    required: true 
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  filename: { 
    type: String, 
    required: true 
  },  // Original file name
  size: { 
    type: Number, 
    required: true 
  },  // File size in bytes
  mimeType: { 
    type: String, 
    required: true 
  },  // MIME type, e.g., "image/png"
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  url: { 
    type: String 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
}, { timestamps: true });

const Media = mongoose.model('Media', mediaSchema);

module.exports = Media;
