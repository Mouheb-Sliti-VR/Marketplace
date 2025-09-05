const mongoose = require('mongoose');
const crypto = require('crypto');

const mediaSchema = new mongoose.Schema({
  secureId: { 
    type: String, 
    required: true, 
    unique: true, 
    default: () => crypto.randomBytes(16).toString('hex') // Generates a secure 16-byte hexadecimal ID
  },
  type: { 
    type: String, 
    enum: ['image', 'video', 'model'], 
    required: true 
  },  // Type of the media file
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
  data: Buffer,  
  url: { 
    type: String 
  },
  uploadedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },  // Reference to the user
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
}, { timestamps: true });

const Media = mongoose.model('Media', mediaSchema);

module.exports = Media;
