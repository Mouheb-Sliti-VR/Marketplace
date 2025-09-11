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
        // Check media type and handle limits
        for (const file of req.files) {
            let mediaType;
            if (file.mimetype.startsWith('image/')) {
                mediaType = 'image';
            } else if (file.mimetype.startsWith('video/')) {
                mediaType = 'video';
            } else if (file.mimetype.startsWith('model/') || 
                      file.mimetype.includes('gltf') || 
                      file.originalname.endsWith('.glb')) {
                mediaType = 'model';
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

        // Set correct MIME type and handle binary files
        if (media.type === 'model') {
            // Force binary transfer for 3D models
            res.set('Content-Type', 'application/octet-stream');
            res.set('Content-Transfer-Encoding', 'binary');
            res.set('Accept-Ranges', 'bytes');

            // Ensure proper extension
            let filename = media.filename;
            const ext = media.mimeType === 'model/gltf-binary' ? '.glb' :
                       media.mimeType === 'model/gltf+json' ? '.gltf' :
                       media.mimeType === 'model/obj' ? '.obj' :
                       media.mimeType === 'application/sla' ? '.stl' :
                       media.mimeType === 'application/x-fbx' ? '.fbx' : '';
            
            if (!filename.endsWith(ext)) {
                filename += ext;
            }

            res.set('Content-Disposition', `attachment; filename="${filename}"`);
            res.set('Content-Length', media.data.length);

            // Send as raw binary buffer
            return res.end(Buffer.from(media.data.buffer), 'binary');
        } else {
            // For non-model files (images, videos)
            res.set('Content-Type', media.mimeType);
            res.set('Content-Disposition', `attachment; filename="${media.filename}"`);
            res.set('Content-Length', media.data.length);
            res.send(media.data);
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
