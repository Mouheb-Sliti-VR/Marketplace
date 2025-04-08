const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true // Index for faster queries
  },
  offer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Offer', 
    required: true 
  },
  subscribedAt: { 
    type: Date, 
    default: Date.now 
  },
}, { 
    timestamps: true // Automatically manage createdAt and updatedAt fields
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;