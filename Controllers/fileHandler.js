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

// Debugging-enhanced uploadFile middleware
const uploadFile = (req, res, next) => {
  console.log("[uploadFile] Called");
  upload.single('media')(req, res, (err) => {
    if (err) {
      console.error("[uploadFile] Multer error:", err);
      // Handle Multer-specific errors
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          console.error("[uploadFile] File size exceeds limit (15MB)");
          return res.status(400).json({ error: 'File is too large. Max size is 15MB.' });
        }
      }
      
      // Handle unsupported file type error
      if (err.message === 'Unsupported file type') {
        console.error("[uploadFile] Unsupported file type");
        return res.status(400).json({ error: 'Unsupported file type. Only images and videos are allowed.' });
      }
      
      // Catch all other errors
      console.error("[uploadFile] Other error occurred:", err.message);
      return res.status(500).json({ error: 'An error occurred during file upload.', details: err.message });
    }

    next();
  });
};

// Debugging-enhanced saveFileToDBAndUpdateUser function
const saveFileToDBAndUpdateUser = async (req, fieldName) => {
  console.log("Uploading : ", fieldName);

  if (!req.file) {
      console.error("[saveFileToDBAndUpdateUser] No file found in request");
      throw new Error('No file uploaded.');
  }

  // Create new Media object
  const media = new Media({
      secureId: generateSecureFileId(),
      mimeType: req.file.mimetype,
      size: req.file.size,
      type: req.file.mimetype.split('/')[0],
      filename: req.file.originalname,
      data: req.file.buffer,
      uploadedBy: req.user._id // Assuming req.user contains the authenticated user's info
  });

  // Save media to the database
  try {
      await media.save();
      console.log("Media saved successfully with ID:", media.secureId, media.filename);
      
      // Set the URL after saving
      media.url = `https://marketplace-vr.onrender.com/media/${media.secureId}`;
      await media.save(); // Save the updated media object with the URL
  } catch (err) {
      console.error("[saveFileToDBAndUpdateUser] Error saving media to DB:", err);
      throw err;
  }

  // Prepare the update object for the user document
  const update = { [fieldName]: media._id };

  // Options to return the updated document
  const options = { new: true };

  // Find the user and update with the new media reference
  let user;
  try {
      user = await User.findOneAndUpdate(
          { email: req.user.email },
          update,
          options
      );
  } catch (err) {
      console.error("[saveFileToDBAndUpdateUser] Error updating user:", err);
      throw err;
  }

  if (!user) {
      console.error("[saveFileToDBAndUpdateUser] User not found with email:", req.user.email);
      throw new Error('User not found');
  }

  return user;
};


// Get the latest media URLs for a given user by company name
async function getLatestMediaURLsForUser(email) {
  try {
      const user = await User.findOne({ email })
          .populate('logo')
          .populate('image1')
          .populate('image2')
          .populate('video');

      //console.log("[getLatestMediaURLsForUser] Retrieved user:", user); // Log the user object

      if (!user) {
          throw new Error('User not found');
      }

      const baseUrl = 'https://marketplace-vr.onrender.com/media';
      return {
          Logo: user.logo ? `${baseUrl}/${user.logo.secureId}` : null,
          Image1: user.image1 ? `${baseUrl}/${user.image1.secureId}` : null,
          Image2: user.image2 ? `${baseUrl}/${user.image2.secureId}` : null,
          Video: user.video ? `${baseUrl}/${user.video.secureId}` : null
      };
  } catch (error) {
      console.error("[getLatestMediaURLsForUser] Error:", error);
      throw error;
  }
}

module.exports = { uploadFile, saveFileToDBAndUpdateUser, getLatestMediaURLsForUser };
