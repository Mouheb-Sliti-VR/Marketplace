const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true },
    companyName: { type: String, required: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 500 }, // Balance of the partner
    logo: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' }, // Reference to the latest logo uploaded
    image1: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' }, // Reference to the latest uploaded image 1
    image2: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' }, // Reference to the latest uploaded image 2
    video: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' }, // Reference to the latest uploaded video
  },
  {
    timestamps: true, // Correct placement of the `timestamps` option
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
