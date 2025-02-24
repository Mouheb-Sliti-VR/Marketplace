const multer = require('multer');
const Media = require('../Models/mediaModel');
const User = require('../Models/userModel');
const crypto = require('crypto');

// Generate unique secure IDs for files
const generateSecureFileId = () => crypto.randomBytes(16).toString('hex');

// Configure Multer with memory storage
const storage = multer.memoryStorage();

// Define the upload middleware with file size limit and file type filtering
const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB file size limit
  fileFilter: (req, file, cb) => {
    console.log('File MIME type:', file.mimetype);  // Log the MIME type of the file
    const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4'];
    
    // Check if the file type is allowed
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Unsupported file type'));
    }
    
    // If the file type is allowed, accept the file
    cb(null, true);
  }
});

// Middleware for handling single file upload
const uploadFile = (req, res, next) => {
  upload.single('media')(req, res, (err) => {
    if (err) {
      // Handle Multer errors (size limit or unsupported file type)
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File is too large. Max size is 15MB.' });
        }
      } 
      
      // Handle other types of errors like unsupported file type
      if (err.message === 'Unsupported file type') {
        return res.status(400).json({ error: 'Unsupported file type. Only images and videos are allowed.' });
      }

      // Catch all other errors
      return res.status(500).json({ error: 'An error occurred during file upload.', details: err.message });
    }

    // If no error, proceed to the next middleware
    next();
  });
};

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
        { email: req.user.email }, 
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

        const baseUrl = process.env.MEDIA_BASE_URL || 'http://localhost:3000/media';
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
