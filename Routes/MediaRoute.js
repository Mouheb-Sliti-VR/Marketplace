const express = require('express');
const router = express.Router();
const { uploadFile, saveFileToDBAndUpdateUser, getLatestMediaURLsForUser } = require('../Controllers/fileHandler');
const {authenticateToken} = require('../Middleware/authMiddleware');
const Media = require('../Models/mediaModel');

// Test route to verify the endpoint is working
router.get('/test', (req, res) => {
    res.json({ message: 'Media route is working' });
});


router.post('/uploadMedia', authenticateToken, uploadFile, async (req, res) => {
    console.log('Upload endpoint hit');
    console.log('Request body:', req.body);
    console.log('Files:', req.files);
    console.log('Headers:', req.headers);
    
    try {
        // Save files to the DB and update the user with the media references
        const updatedUser = await saveFileToDBAndUpdateUser(req);

        // Respond with the updated user data
        res.json({
            message: 'Files uploaded successfully',
            uploadedFiles: req.files.map(file => file.originalname),
            user: updatedUser
        });
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
        const mediaURLs = await getLatestMediaURLsForUser(email); 
        res.json(mediaURLs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

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
