const express = require('express');
const router = express.Router();
const { uploadFile, saveFileToDBAndUpdateUser, getLatestMediaURLsForUser } = require('../Controllers/fileHandler');
const authenticateToken = require('../Middleware/authMiddleware'); // Authentication middleware
const Media = require('../Models/mediaModel');

// Handle upload of media and update user
router.post('/uploadMedia', authenticateToken,uploadFile, async (req, res) => {
    try {
        const { fieldName } = req.body;

        if (!fieldName) {
            return res.status(400).json({ error: 'fieldName is required in the request body' });
        }

        // Save file to the DB and update the user with the media reference
        const updatedUser = await saveFileToDBAndUpdateUser(req, fieldName);

        // Respond with the updated user data (media references)
        const response = {
            logo: updatedUser.logo,
            image1: updatedUser.image1,
            image2: updatedUser.image2,
            video: updatedUser.video
        };

        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

router.post('/latestMediaURLs', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required in the request body' });
    }

    try {
        const mediaURLs = await getLatestMediaURLsForUser(email); // Pass email instead of companyName
        res.json(mediaURLs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

// Route to serve media files by their secureId
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const media = await Media.findOne({ secureId: id });

        if (!media) {
            return res.status(404).send('Media not found');
        }

        // Set correct MIME type and send the file
        res.set('Content-Type', media.mimeType);
        res.send(media.data); // Send the media binary data
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
