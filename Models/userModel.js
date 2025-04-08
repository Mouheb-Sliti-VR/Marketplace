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
    balance: { 
      type: Number, 
      default: 500, 
      min: 0 // Ensure balance cannot be negative
    },

    logo: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' },
    image1: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' }, 
    image2: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' }, 
    video: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' }, 

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