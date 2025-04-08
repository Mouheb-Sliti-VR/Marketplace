// controllers/subscriptionController.js
const Subscription = require("../Models/subscriptionModel");
const Offer = require("../Models/offerModel");
const User = require("../Models/userModel");


async function createSubscription(req, res) {
  try {
    // Log the incoming request and user details
    console.log("Received subscription creation request:", req.body);
    console.log("Authenticated user:", req.user);

    // Ensure user is authenticated
    if (!req.user || !req.user._id) {
      console.warn("Unauthorized access attempt: No user found in token");
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No user found in token",
      });
    }

    const { offerId } = req.body;
    const userId = req.user._id; // Extract user ID from authenticated token

    // Log the offer ID being processed
    console.log(`Attempting to create a subscription for user ID '${userId}' with offer ID '${offerId}'`);

    // Check if the offer exists
    const offer = await Offer.findById(offerId);
    if (!offer) {
      console.warn(`Offer with ID '${offerId}' not found`);
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    // Log the offer details
    console.log("Offer found:", offer);

    // Retrieve the user's company name
    const user = await User.findById(userId);
    if (!user) {
      console.warn(`User with ID '${userId}' not found`);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Log the subscription creation success with company name and offer name
    console.log(
      `The Company '${user.companyName}' subscribed successfully to the offer '${offer.name}'`
    );

    // Create a new subscription with the authenticated user
    const subscription = new Subscription({ user: userId, offer: offerId });

    await subscription.save();

    // Respond with the newly created subscription
    res.status(201).json({ success: true, data: subscription });
  } catch (error) {
    // Log the error details
    console.error("Error occurred while creating subscription:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getUserSubscriptions(req) {
  // Ensure user is authenticated
  if (!req.user || !req.user.email) {
    throw new Error('Unauthorized: No user found in token');
  }

  // Retrieve the user details based on the authenticated email
  const user = await User.findOne({ email: req.user.email })
    .select('logo email companyName balance') // Select only necessary fields
    .populate('logo'); // Populate the logo field

  if (!user) {
    throw new Error('User not found.');
  }

  // Find all subscriptions for the user
  const subscriptions = await Subscription.find({ user: user._id }).populate("offer");

  // Map through subscriptions and return only the necessary offer details
  const userOffers = subscriptions.map((subscription) => {
    if (!subscription.offer) {
      console.warn("Offer not found for subscription:", subscription._id);
      return null; // Return null if no offer exists for this subscription
    }
    return {
      name: subscription.offer.name,
      subtitle: subscription.offer.subtitle,
      description: subscription.offer.description,
      expiresIn: subscription.offer.expiresIn.toISOString().split("T")[0], // Format date to 'YYYY-MM-DD'
    };
  }).filter((offer) => offer !== null); // Filter out null offers

  return {
    logo: user.logo ? `https://marketplace-1-5g2u.onrender.com/media/${user.logo.secureId}` : null,
    email: user.email,
    companyName: user.companyName,
    balance: user.balance,
    offers: userOffers, // Include subscribed offers in the response
  };
}


module.exports = { createSubscription, getUserSubscriptions };
