// MediaRoute.js
const express = require('express');
const router = express.Router();
const { uploadFile, saveFileToDBAndUpdateUser, getLatestMediaURLsForUser }  = require('../Controllers/fileHandler');
const authenticateToken = require('../Middleware/authMiddleware'); // Import the authentication middleware
const Media = require ("../Models/mediaModel")

// Handle upload of media and update user
router.post('/uploadMedia', authenticateToken, uploadFile, async (req, res) => {
    try {
        const fieldName = req.body.fieldName;

        if (!fieldName) {
            throw new Error('fieldName is required in the request body');
        }

        // Save the uploaded file to the database and update the user document
        const updatedUser = await saveFileToDBAndUpdateUser(req, fieldName);

        // Construct the response object with updated user details
        const response = {
            logo: updatedUser.logo,
            image1: updatedUser.image1,
            image2: updatedUser.image2,
            video: updatedUser.video
        };

        // Send back the updated user document
        res.json(response);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Handle request for latest media URLs
router.post('/latestMediaURLs', async (req, res) => {
    const { companyName } = req.body;

    try {
        const mediaURLs = await getLatestMediaURLsForUser(companyName);
        res.json(mediaURLs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

 // Route to serve media files
 router.get('/:filename', async (req, res) => {
    try {
      const filename = req.params.filename;
      const media = await Media.findOne({ filename });

      if (!media) {
        return res.status(404).send('Media not found');
      }

      // Set the appropriate content type based on the media type
      res.set('Content-Type', media.type);
      
      // Send the media file data in the response
      res.send(media.data);
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  });
  



module.exports = router;