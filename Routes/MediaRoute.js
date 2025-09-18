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
    
    try {
        // Check if files exist
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            throw new Error('No files were uploaded');
        }

        // Check media type and handle limits
        for (const file of req.files) {
            let mediaType;
            // Force GLB mimetype for 3D models
            if (file.mimetype.startsWith('model/') || 
                file.mimetype.includes('gltf') || 
                file.originalname.match(/\.(glb|gltf|obj|fbx|stl)$/i)) {
                mediaType = 'model';
                file.mimetype = 'model/gltf-binary';
                
                // Ensure filename ends with .glb
                if (!file.originalname.endsWith('.glb')) {
                    file.originalname = file.originalname.replace(/\.[^/.]+$/, '') + '.glb';
                }
            } else if (file.mimetype.startsWith('image/')) {
                mediaType = 'image';
            } else if (file.mimetype.startsWith('video/')) {
                mediaType = 'video';
            }

            // Check and handle media limits
            const mediaCount = await Media.countDocuments({ 
                user: req.user._id, 
                type: mediaType 
            });

            const limit = mediaType === 'image' ? 4 : 
                         mediaType === 'video' ? 2 : 1;

            if (mediaCount >= limit) {
                // Delete oldest media of this type
                const oldestMedia = await Media.findOne({ 
                    user: req.user._id, 
                    type: mediaType 
                }).sort({ createdAt: 1 });

                if (oldestMedia) {
                    await Media.deleteOne({ _id: oldestMedia._id });
                    console.log(`Deleted oldest ${mediaType} for user ${req.user.email}`);
                }
            }
        }

        // Save files to the DB and update the user with the media references
        const updatedUser = await saveFileToDBAndUpdateUser(req);

        // Respond with the updated user data
        res.json({
            message: 'Files uploaded successfully',
            uploadedFiles: req.files?.map(file => file.originalname) || [],
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

        // Set appropriate headers
        res.set('Content-Type', media.type === 'model' ? 'model/gltf-binary' : media.mimeType);
        res.set('Content-Disposition', `attachment; filename="${media.filename}"`);

        // Stream from GridFS if the file is stored there
        if (media.gridFSId) {
            try {
                const stream = await getMediaStream(media.gridFSId);
                return stream.pipe(res);
            } catch (err) {
                console.error('GridFS streaming error:', err);
                return res.status(500).send('Error streaming file');
            }
        }

        // For files stored in MongoDB directly
        if (media.data) {
            res.set('Content-Length', media.data.length);
            return res.send(media.data);
        }

        // If we get here, something's wrong with the file storage
        res.status(404).send('File data not found');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
