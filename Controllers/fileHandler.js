const multer = require('multer');
const Media = require('../Models/mediaModel');
const User = require('../Models/userModel');
const crypto = require('crypto');

// Generate unique secure IDs for files
const generateSecureFileId = () => crypto.randomBytes(16).toString('hex');

// Setup multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB file size limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Unsupported file type'));
        }
        cb(null, true);
    }
});

// Middleware for handling single file upload
const uploadFile = upload.single('media');

// Save file to DB and update user
const saveFileToDBAndUpdateUser = async (req, fieldName) => {
    if (!req.file) {
        throw new Error('No file uploaded.');
    }

    const media = new Media({
        secureId: generateSecureFileId(),
        mimeType: req.file.mimetype, // Store mimeType
        size: req.file.size,         // Store size
        type: req.file.mimetype.split('/')[0], // 'image' or 'video'
        filename: req.file.originalname, // Store original filename
        data: req.file.buffer // Store file data in buffer
    });

    // Save media to database
    await media.save();

    // Update the user document with the media ObjectId reference
    const update = { [fieldName]: media._id };
    const options = { new: true };

    const user = await User.findOneAndUpdate(
        { email: req.user.email }, // Assuming email in JWT token
        update,
        options
    );

    if (!user) {
        throw new Error('User not found');
    }

    return user; // Return updated user with media references
};

// Get the latest media URLs for a given user by company name
async function getLatestMediaURLsForUser(email) {
    try {
        const user = await User.findOne({ email })
            .populate('logo')
            .populate('image1')
            .populate('image2')
            .populate('video');

        if (!user) {
            throw new Error('User not found');
        }

        const baseUrl = process.env.MEDIA_BASE_URL || 'http://localhost:3000//media';
        return {
            Logo: user.logo ? `${baseUrl}/${user.logo.secureId}` : null,
            Image1: user.image1 ? `${baseUrl}/${user.image1.secureId}` : null,
            Image2: user.image2 ? `${baseUrl}/${user.image2.secureId}` : null,
            Video: user.video ? `${baseUrl}/${user.video.secureId}` : null
        };
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports = { uploadFile, saveFileToDBAndUpdateUser, getLatestMediaURLsForUser };
