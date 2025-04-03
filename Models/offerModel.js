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
}, { timestamps: true });

module.exports = mongoose.model("Offer", OfferSchema);
