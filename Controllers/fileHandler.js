const multer = require('multer');
const Media = require('../Models/mediaModel');
const User = require('../Models/userModel');
const crypto = require('crypto');
const { getMediaUrl } = require('../utils/urlConfig');

// Generate unique secure IDs for files
const generateSecureFileId = () => crypto.randomBytes(16).toString('hex');

// Configure Multer with memory storage
const storage = multer.memoryStorage();

// Define the upload middleware with file size limit and file type filtering
const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB file size limit
  fileFilter: (_, file, cb) => {
    // No need to log every MIME type in production
    const allowedTypes = [
      'image/jpeg', 
      'image/png', 
      'video/mp4',
      'model/gltf-binary', // GLB MIME type
      'application/octet-stream' // Alternative MIME type for GLB files
    ];
    
    // Check file extension for GLB files and set appropriate mimetype
    if (file.originalname.toLowerCase().endsWith('.glb')) {
      file.mimetype = 'model/gltf-binary';
      return cb(null, true);
    }
    
    // Check if the file type is allowed
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Unsupported file type'));
    }
    
    // If the file type is allowed, accept the file
    cb(null, true);
  }
});

// Debugging-enhanced uploadFile middleware for single or multiple files
const uploadFile = (req, res, next) => {
  console.log(`[Upload] Starting upload for user: ${req.user.email}`);
  
  // Determine if this is a profile update request
  const isProfileUpdate = req.path.includes('/updateProfile');
  
  if (isProfileUpdate) {
    // For profile updates, handle single logo file
    console.log('[Upload] Handling profile update with possible logo');
    upload.single('logo')(req, res, (err) => {
      if (err) {
        // If no logo file is provided, just continue
        if (err instanceof multer.MulterError && err.code === 'LIMIT_UNEXPECTED_FILE') {
          console.log('[Upload] No logo file provided, continuing with profile update');
          return next();
        }
        console.error("[uploadFile] Logo upload error:", err);
        return res.status(400).json({ error: err.message });
      }
      console.log('[Upload] Logo file processed successfully');
      next();
    });
  } else {
    // For media content uploads, handle multiple files
    console.log('[Upload] Handling multiple media files upload');
    upload.array('media', 10)(req, res, (err) => {  // Allow up to 10 files
      if (err) {
        console.error("[uploadFile] Multer error:", err);
        // Handle Multer-specific errors
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            console.error(`[Upload] File size exceeds 15MB limit for user: ${req.user.email}`);
            return res.status(400).json({ error: 'File is too large. Max size is 15MB.' });
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            console.error(`[Upload] Too many files attempted by user: ${req.user.email}`);
            return res.status(400).json({ error: 'Too many files. Maximum is 10 files.' });
          }
        }
        
        // Handle unsupported file type error
        if (err.message === 'Unsupported file type') {
          console.error(`[Upload] Unsupported file type from user: ${req.user.email}`);
          return res.status(400).json({ error: 'Unsupported file type. Only images and videos are allowed.' });
        }
        
        // Catch all other errors
        console.error(`[Upload] Error: ${err.message} for user: ${req.user.email}`);
        return res.status(500).json({ error: 'An error occurred during file upload.', details: err.message });
      }

      next();
    });
  }
};

// Debugging-enhanced saveFileToDBAndUpdateUser function
const saveFileToDBAndUpdateUser = async (req, fieldName) => {
  console.log(`[Media] Processing upload for user: ${req.user.email}`);

  const isProfileUpdate = req.path.includes('/updateProfile');
  let userUpdate = {};
  
  // Handle profile update with optional logo
  if (isProfileUpdate) {
    console.log('[Media] Processing profile update');
    
    // Include profile fields in update
    const { address, zipCode, city, country } = req.body;
    userUpdate = {
      ...(address && { address: address.trim() }),
      ...(zipCode && { zipCode: zipCode.trim() }),
      ...(city && { city: city.trim() }),
      ...(country && { country: country.trim() })
    };
    
    // Handle logo file if present
    if (req.file) {
      console.log('[Media] Processing logo file for profile update');
      
      // First, get the current user to check if they already have a logo
      const currentUser = await User.findOne({ _id: req.user._id });
      if (currentUser.logo) {
        // If there's an existing logo, delete it from Media collection
        await Media.findByIdAndDelete(currentUser.logo);
      }

      const media = new Media({
        secureId: generateSecureFileId(),
        mimeType: req.file.mimetype,
        size: req.file.size,
        type: req.file.mimetype.split('/')[0],
        filename: req.file.originalname,
        data: req.file.buffer,
        uploadedBy: req.user._id
      });

      try {
        await media.save();
        media.url = getMediaUrl(media.secureId);
        await media.save();
        userUpdate.logo = media._id;
        console.log('[Media] Logo saved successfully');
      } catch (err) {
        console.error(`[Media] Logo save failed for user: ${req.user.email}, error: ${err.message}`);
        throw err;
      }
    }
  } 
  // Handle multiple media files (images/videos/3D models)
  else if (req.files && req.files.length > 0) {
    console.log(`[Media] Processing ${req.files.length} media files`);
    const uploadedFiles = {
      images: [],
      videos: [],
      model3d: null
    };

    for (const file of req.files) {
      const media = new Media({
        secureId: generateSecureFileId(),
        mimeType: file.mimetype,
        size: file.size,
        type: file.mimetype.split('/')[0],
        filename: file.originalname,
        data: file.buffer,
        uploadedBy: req.user._id
      });

      try {
        await media.save();
        media.url = getMediaUrl(media.secureId);
        await media.save();

        // Categorize media based on type
        if (media.type === 'image') {
          uploadedFiles.images.push(media._id);
        } else if (media.type === 'video') {
          uploadedFiles.videos.push(media._id);
        } else if (file.mimetype === 'model/gltf-binary' || file.originalname.toLowerCase().endsWith('.glb')) {
          uploadedFiles.model3d = media._id;
        }
      } catch (err) {
        console.error(`[Media] Save failed for user: ${req.user.email}, error: ${err.message}`);
        throw err;
      }
    }

    // Build update object for multiple files
    if (uploadedFiles.images.length > 0) {
      userUpdate.$push = userUpdate.$push || {};
      userUpdate.$push.images = { $each: uploadedFiles.images };
    }
    if (uploadedFiles.videos.length > 0) {
      userUpdate.$push = userUpdate.$push || {};
      userUpdate.$push.videos = { $each: uploadedFiles.videos };
    }
    if (uploadedFiles.model3d) {
      userUpdate.model3d = uploadedFiles.model3d;
    }
  }

  // Options to return the updated document
  const options = { new: true };
  let user;
  try {
    // Update using _id instead of email for more reliable updates
    user = await User.findOneAndUpdate(
      { _id: req.user._id },
      userUpdate,
      options
    );
  } catch (err) {
    console.error(`[Media] User update failed for: ${req.user.email}, error: ${err.message}`);
    throw err;
  }

  if (!user) {
    console.error(`[Media] User not found: ${req.user.email}`);
    throw new Error('User not found');
  }

  // Build a clean user response
  const cleanUser = {
    _id: user._id,
    email: user.email,
    companyName: user.companyName,
    images: user.images,
    videos: user.videos,
    logo: user.logo,
    model3d: user.model3d
  };
  return cleanUser;
};


// Get the latest media URLs for a given user by company name
async function getLatestMediaURLsForUser(email) {
  try {
    const user = await User.findOne({ email })
      .populate('logo')
      .populate('images')
      .populate('videos')
      .populate('model3d');

    if (!user) {
      throw new Error('User not found');
    }

    return {
      logo: user.logo ? getMediaUrl(user.logo.secureId) : null,
      images: user.images ? user.images.map(img => getMediaUrl(img.secureId)) : [],
      videos: user.videos ? user.videos.map(vid => getMediaUrl(vid.secureId)) : [],
      model3d: user.model3d ? getMediaUrl(user.model3d.secureId) : null
    };
  } catch (error) {
    console.error(`[Media] Failed to get media URLs for user: ${email}, error: ${error.message}`);
    throw error;
  }
}

module.exports = { uploadFile, saveFileToDBAndUpdateUser, getLatestMediaURLsForUser };