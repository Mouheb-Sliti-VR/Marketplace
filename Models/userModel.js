const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true },
    companyName: { type: String, required: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 500 }, // Default Balance of the partner = 500

    logo: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' },
    image1: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' }, 
    image2: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' }, 
    video: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' }, 

    address: { type: String, default: ""  },
    zipCode: { type: String, default: "" },
    city: { type: String, default: "" },
    country: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
