// controllers/subscriptionController.js
const Subscription = require("../Models/subscriptionModel");
const Offer = require("../Models/offerModel");

async function createSubscription(req, res) {
  try {
    // Log the incoming request and user details
    console.log("Received subscription creation request:", req.body);
    console.log("Authenticated user:", req.user);

    // Ensure user is authenticated
    if (!req.user || !req.user._id) {
      console.warn("Unauthorized access attempt: No user found in token");
      return res
        .status(401)
        .json({
          success: false,
          message: "Unauthorized: No user found in token",
        });
    }

    const { offerId } = req.body;
    const userId = req.user._id; // Extract user ID from authenticated token

    // Log the offer ID being processed
    console.log(
      `Attempting to create a subscription for user '${userId}' with offer ID '${offerId}'`
    );

    // Check if the offer exists
    const offer = await Offer.findById(offerId);
    if (!offer) {
      console.warn(`Offer with ID '${offerId}' not found`);
      return res
        .status(404)
        .json({ success: false, message: "Offer not found" });
    }

    // Log the offer details
    console.log("Offer found:", offer);

    // Create a new subscription with the authenticated user
    const subscription = new Subscription({ user: userId, offer: offerId });
    console.log("Ready to save subscription to database");

    await subscription.save();

    // Log the subscription creation success
    console.log(
      `Subscription created successfully for user '${userId}' with offer '${offerId}'`
    );

    // Respond with the newly created subscription
    res.status(201).json({ success: true, data: subscription });
  } catch (error) {
    // Log the error details
    console.error("Error occurred while creating subscription:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getUserSubscriptions(req, res) {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user._id) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Unauthorized: No user found in token",
        });
    }

    const userId = req.user._id;

    // Find all subscriptions for the user
    const subscriptions = await Subscription.find({ user: userId }).populate(
      "offer"
    );

    // If no subscriptions found
    if (subscriptions.length === 0) {
      return res
        .status(404)
        .json({
          success: false,
          message: "No subscriptions found for this user.",
        });
    }

    // Map through subscriptions and return only the necessary offer details
    const userOffers = subscriptions
      .map((subscription) => {
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
      })
      .filter((offer) => offer !== null); // Filter out null offers

    res.status(200).json({
      offers: userOffers,
    });

    console.log("User offers successfully retrieved.");
    console.log("Offers:", userOffers);
  } catch (error) {
    console.error("Error fetching user subscriptions:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

module.exports = { createSubscription, getUserSubscriptions };
