// controllers/offerController.js
const Offer = require("../Models/offerModel");

async function createOffer(req, res) {
  try {
    // Log the incoming request details
    console.log("Received offer creation request:", req.body);

    const { name, subtitle, description, expiresIn } = req.body;

    // Log the details of the offer being created
    console.log(
      `Creating new offer: Name='${name}', Subtitle='${subtitle}', Expires In='${expiresIn}'`
    );

    // Create a new offer instance
    const offer = new Offer({
      name,
      subtitle,
      description,
      expiresIn,
    });

    // Save the offer to the database
    await offer.save();

    // Log the success of the offer creation
    console.log(`Offer created successfully: ${offer._id}`);

    res.status(201).json({
      data: offer,
    });
  } catch (error) {
    // Log the error details
    console.error("Error occurred while creating offer:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

async function getOffers(req, res) {
  try {
    // Fetch offers from the database
    const offers = await Offer.find();

    console.log(`Found ${offers.length} offers in the database.`);

    // Simplify the offer response, including the offer's id
    const simplifiedOffers = offers.map((offer) => ({
      id: offer._id,
      name: offer.name,
      subtitle: offer.subtitle,
      description: offer.description,
      expiresIn: offer.expiresIn.toISOString().split("T")[0], // Format date to 'YYYY-MM-DD'
    }));

    // Send the simplified response
    res.status(200).json({
      offers: simplifiedOffers,
    });
  } catch (error) {
    console.error("Error fetching offers:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}


async function deleteOffer(req, res) {
  try {
    const { id } = req.params;


    console.log(`Received request to delete offer with ID: ${id}`);

    // Find the offer by its ID and remove it
    const offer = await Offer.findByIdAndDelete(id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: `Offer with ID ${id} not found.`,
      });
    }

    // Log the successful deletion
    console.log(`Offer with ID ${id} successfully deleted.`);

    // Send response
    res.status(200).json({
      success: true,
      message: `Offer with ID ${id} deleted successfully.`,
    });
  } catch (error) {
    console.error("Error occurred while deleting offer:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

module.exports = { createOffer, getOffers, deleteOffer };
