const mongoose = require("mongoose");

const OfferSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    subtitle: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    expiresIn: {
        type: Date, // Expiration date for the offer
        required: true,
    }
}, { 
    timestamps: true // Automatically manage createdAt and updatedAt fields
});

const Offer = mongoose.model("Offer", OfferSchema);

module.exports = Offer;