const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { 
      type: String, 
      unique: true, 
      required: true, 
      index: true,
      match: /.+\@.+\..+/ // Basic email format validation
    },
    companyName: { type: String, required: true },
    password: { type: String, required: true },

    // Company logo (single media reference)
    logo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media'
    },

    // Uploaded images (array, flexible per offer)
    images: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media'
    }],

    // Uploaded videos (array, flexible per offer)
    videos: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media'
    }],

    // 3D model (single reference, max one per user)
    model3d: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media'
    },

    address: { type: String, default: "" },
    zipCode: { type: String, default: "" },
    city: { type: String, default: "" },
    country: { type: String, default: "" },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User