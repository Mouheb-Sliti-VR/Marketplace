const multer = require('multer');
const Media = require('../Models/mediaModel');
const User = require('../Models/userModel');
const crypto = require('crypto');
const path = require('path');
const { getMediaUrl } = require('../utils/urlConfig');

// Generate unique secure IDs for files
const generateSecureFileId = () => crypto.randomBytes(16).toString('hex');

// Configure Multer with memory storage
const storage = multer.memoryStorage();

// Define the upload middleware with file size limit and file type filtering
const upload = multer({
  storage: storage,
  limits: { fileSize: 16 * 1024 * 1024 }, // 200 MB file size limit
  fileFilter: (req, file, cb) => {
    console.log(`[Upload] Processing file: ${file.originalname}, MIME type: ${file.mimetype}`);
    
    const allowedTypes = [
      'image/jpeg', 
      'image/png', 
      'video/mp4',
      'model/gltf-binary',
      'application/octet-stream',
      'model/obj',
      'model/gltf+json',
      'application/x-fbx',
      'application/sla',
      'application/stl'
    ];
    
    // Handle GLB files
    if (file.originalname.toLowerCase().endsWith('.glb')) {
      console.log(`[Upload] GLB file detected: ${file.originalname}`);
      file.mimetype = 'model/gltf-binary';
      return cb(null, true);
    }

    // Handle other 3D model formats
    const modelExtensions = ['.obj', '.gltf', '.fbx', '.stl'];
    const isModelFile = modelExtensions.some(ext => 
      file.originalname.toLowerCase().endsWith(ext)
    );

    if (isModelFile) {
      console.log(`[Upload] 3D model file detected: ${file.originalname}`);
      return cb(null, true);
    }
    
    // Check if the file type is allowed
    if (!allowedTypes.includes(file.mimetype)) {
      console.log(`[Upload] Unsupported file type: ${file.mimetype} for file: ${file.originalname}`);
      return cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed types are: images (jpg/png), videos (mp4), and 3D models (glb/obj/gltf/fbx/stl)`));
    }
    
    console.log(`[Upload] File accepted: ${file.originalname}`);
    cb(null, true);
  }
});

// Debugging-enhanced uploadFile middleware for single or multiple files
const uploadFile = (req, res, next) => {
  console.log(`[Upload] Starting upload for user: ${req.user.email}`);
  
  // Debug logging
  console.log('Upload endpoint hit');
  console.log('Request body:', req.body);
  console.log('Headers:', req.headers);
  
  // Check content type
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    console.error('[Upload] Invalid content type:', contentType);
    return res.status(400).json({ 
      error: 'Invalid content type. Must be multipart/form-data' 
    });
  }
  
  // Determine if this is a profile update request
  const isProfileUpdate = req.path.includes('/updateProfile');
  
  if (isProfileUpdate) {
    // For profile updates, handle single logo file
    console.log('[Upload] Handling profile update with possible logo');
    console.log('[Upload] Request files state:', {
      hasFiles: !!req.files,
      fileCount: req.files?.length,
      hasFile: !!req.file,
      contentType: req.headers['content-type']
    });
    
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
      
      console.log('[Upload] Logo file processed:', {
        hasFile: !!req.file,
        filename: req.file?.originalname,
        fieldname: req.file?.fieldname,
        mimetype: req.file?.mimetype
      });
      
      next();
    });
  } else {
    // For media content uploads, handle multiple files
    console.log('[Upload] Handling multiple media files upload');
    const uploadMiddleware = multer({
      storage: storage,
      limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB file size limit
      fileFilter: (req, file, cb) => {
        console.log(`[Upload] Processing file in array: ${file.originalname}, MIME type: ${file.mimetype}`);
        
        // Handle GLB files
        if (file.originalname.toLowerCase().endsWith('.glb')) {
          console.log(`[Upload] GLB file detected in array: ${file.originalname}`);
          file.mimetype = 'model/gltf-binary';
          return cb(null, true);
        }

        // Handle other 3D model formats
        const modelExtensions = ['.obj', '.gltf', '.fbx', '.stl'];
        if (modelExtensions.some(ext => file.originalname.toLowerCase().endsWith(ext))) {
          console.log(`[Upload] 3D model file detected in array: ${file.originalname}`);
          return cb(null, true);
        }

        // Handle images and videos
        const allowedTypes = [
          'image/jpeg', 
          'image/png', 
          'video/mp4',
          'model/gltf-binary',
          'application/octet-stream'
        ];

        if (!allowedTypes.includes(file.mimetype)) {
          console.log(`[Upload] Invalid file type in array: ${file.mimetype}, file: ${file.originalname}`);
          return cb(new Error(`File type not allowed for ${file.originalname}. Allowed types: jpg, png, mp4, glb, obj, gltf, fbx, stl`));
        }

        console.log(`[Upload] File accepted in array: ${file.originalname}`);
        cb(null, true);
      }
    }).array('media', 10);

    uploadMiddleware(req, res, (err) => {
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
        
        // Handle unsupported file type error with more detail
        console.error(`[Upload] File upload error for user: ${req.user.email}:`, err.message);
        return res.status(400).json({ 
          error: err.message || 'Unsupported file type. Allowed types: jpg, png, mp4, glb, obj, gltf, fbx, stl'
        });
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

  // Helper function to create media document
  const createMediaDoc = async (file, type) => {
    const newMedia = new Media({
      type: type,
      filename: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      data: file.buffer,
      user: req.user._id // Set the user ID from the authenticated request
    });
    return await newMedia.save();
  };

  // Function to handle media limits
  const handleMediaLimits = async (userId, fileType) => {
    let oldestMedia;
    switch(fileType) {
      case 'image':
        const imageCount = await Media.countDocuments({ user: userId, type: 'image' });
        if (imageCount >= 4) {
          oldestMedia = await Media.findOne({ user: userId, type: 'image' }).sort({ createdAt: 1 });
        }
        break;
      case 'video':
        const videoCount = await Media.countDocuments({ user: userId, type: 'video' });
        if (videoCount >= 2) {
          oldestMedia = await Media.findOne({ user: userId, type: 'video' }).sort({ createdAt: 1 });
        }
        break;
      case 'model':
        oldestMedia = await Media.findOne({ user: userId, type: 'model' });
        break;
    }
    if (oldestMedia) {
      await Media.deleteOne({ _id: oldestMedia._id });
      console.log(`[Media] Deleted oldest ${fileType} for user ${req.user.email}`);
    }
  };
  
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
      console.log('[Media] Processing logo file for profile update:', {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        fieldname: req.file.fieldname
      });
      
      // First, get the current user to check if they already have a logo
      const currentUser = await User.findOne({ _id: req.user._id });
      console.log('[Media] Current user logo state:', {
        userId: currentUser._id,
        hasExistingLogo: !!currentUser.logo,
        existingLogoId: currentUser.logo
      });
      
      if (currentUser.logo) {
        // If there's an existing logo, delete it from Media collection
        console.log('[Media] Deleting existing logo:', currentUser.logo);
        await Media.findByIdAndDelete(currentUser.logo);
      }

      const media = new Media({
        secureId: generateSecureFileId(),
        mimeType: req.file.mimetype,
        size: req.file.size,
        type: 'image', // Force type as image for logo
        filename: req.file.originalname,
        data: req.file.buffer,
        user: req.user._id // Set the user ID from the authenticated request
      });

      try {
        await media.save();
        console.log('[Media] New logo media saved with ID:', media._id);
        
        // Set the URL
        media.url = getMediaUrl(media.secureId);
        await media.save();
        
        // Update user's logo field
        userUpdate.logo = media._id;
        console.log('[Media] Logo reference saved successfully:', media._id);
        
        // Double-check media was saved
        const savedMedia = await Media.findById(media._id);
        if (!savedMedia) {
          throw new Error('Media save verification failed');
        }
        console.log('[Media] Logo save verified:', savedMedia._id);
      } catch (err) {
        console.error(`[Media] Logo save failed for user: ${req.user.email}, error:`, err);
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
      // Determine the type of media
      let mediaType;
      if (file.mimetype.startsWith('image/')) {
        mediaType = 'image';
      } else if (file.mimetype.startsWith('video/')) {
        mediaType = 'video';
      } else if (
        file.mimetype === 'model/gltf-binary' ||
        file.originalname.toLowerCase().endsWith('.glb') ||
        file.originalname.toLowerCase().endsWith('.obj') ||
        file.originalname.toLowerCase().endsWith('.gltf') ||
        file.originalname.toLowerCase().endsWith('.fbx') ||
        file.originalname.toLowerCase().endsWith('.stl')
      ) {
        mediaType = 'model';
      }

      console.log(`[Media] Processing file: ${file.originalname} as type: ${mediaType}`);

      let mimeType = file.mimetype;
      // For 3D models, ensure we have the correct MIME type
      if (mediaType === 'model') {
        if (file.originalname.toLowerCase().endsWith('.glb')) {
          mimeType = 'model/gltf-binary';
        } else {
          const ext = path.extname(file.originalname).toLowerCase();
          switch (ext) {
            case '.gltf':
              mimeType = 'model/gltf+json';
              break;
            case '.obj':
              mimeType = 'model/obj';
              break;
            case '.stl':
              mimeType = 'application/sla';
              break;
            case '.fbx':
              mimeType = 'application/x-fbx';
              break;
            default:
              // If we can't determine the type, use the original mimetype
              console.log(`[Media] Using original mimetype for unknown extension: ${ext}`);
          }
        }
      }

      const media = new Media({
        secureId: generateSecureFileId(),
        mimeType: mimeType,
        size: file.size,
        type: mediaType,
        filename: file.originalname,
        data: file.buffer,
        user: req.user._id
      });

      try {
        await media.save();
        media.url = getMediaUrl(media.secureId);
        await media.save();

        // Categorize media based on type
        if (mediaType === 'image') {
          uploadedFiles.images.push(media._id);
        } else if (mediaType === 'video') {
          uploadedFiles.videos.push(media._id);
        } else if (mediaType === 'model') {
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
      // For 3D models, we replace rather than push since we only want one
      userUpdate.model3d = uploadedFiles.model3d;
      // Remove the old 3D model if it exists
      const currentUser = await User.findById(req.user._id);
      if (currentUser.model3d) {
        await Media.findByIdAndDelete(currentUser.model3d);
      }
    }
  }

  console.log('[Media] Preparing user update:', {
    userId: req.user._id,
    updateData: JSON.stringify(userUpdate)
  });

  let user;
  try {
    // Ensure we have a valid update object for MongoDB
    const finalUpdate = {};
    
    // Handle profile fields
    if (userUpdate.address) finalUpdate.address = userUpdate.address;
    if (userUpdate.zipCode) finalUpdate.zipCode = userUpdate.zipCode;
    if (userUpdate.city) finalUpdate.city = userUpdate.city;
    if (userUpdate.country) finalUpdate.country = userUpdate.country;
    
    // Handle logo update
    if (userUpdate.logo) {
      finalUpdate.logo = userUpdate.logo;
      console.log('[Media] Including logo in update:', finalUpdate.logo);
    }
    
    // Handle array updates ($push operations)
    if (userUpdate.$push) {
      finalUpdate.$push = userUpdate.$push;
    }

    // Handle model3d update
    if (userUpdate.model3d) {
      finalUpdate.model3d = userUpdate.model3d;
      console.log('[Media] Including model3d in update:', finalUpdate.model3d);
    }

    console.log('[Media] Final update object:', {
      finalUpdate: JSON.stringify(finalUpdate),
      hasLogo: !!finalUpdate.logo,
      hasModel3d: !!finalUpdate.model3d
    });

    // First check if user exists
    const existingUser = await User.findById(req.user._id);
    if (!existingUser) {
      console.error(`[Media] User not found with ID: ${req.user._id}`);
      throw new Error('User not found');
    }

    // Apply the update
    user = await User.findOneAndUpdate(
      { _id: req.user._id },
      finalUpdate,
      { 
        new: true, 
        runValidators: true 
      }
    ).populate('logo')
     .populate('images')
     .populate('videos')
     .populate('model3d');

    if (!user) {
      console.error(`[Media] Update failed for user ID: ${req.user._id}`);
      throw new Error('Failed to update user');
    }

    console.log('[Media] User updated successfully:', {
      userId: user._id,
      hasLogo: !!user.logo,
      hasModel3d: !!user.model3d
    });

    console.log('[Media] User update result:', {
      id: user._id,
      logo: user.logo?._id,
      updateApplied: userUpdate
    });

  } catch (err) {
    console.error(`[Media] User update failed for: ${req.user.email}, error:`, err);
    throw err;
  }

  if (!user) {
    console.error(`[Media] User not found: ${req.user.email}`);
    throw new Error('User not found');
  }

    // Verify the logo was properly linked and log the verification process
  if (userUpdate.logo) {
    console.log('[Media] Starting logo verification process');
    
    // First verify the media exists
    let logoExists;
    try {
      logoExists = await Media.findById(userUpdate.logo).lean();
      console.log('[Media] Logo lookup result:', logoExists ? 'Found' : 'Not found');
    } catch (err) {
      console.error('[Media] Error looking up logo:', err);
      throw new Error('Error verifying logo in database');
    }

    if (!logoExists) {
      console.error('[Media] Logo media not found in database:', userUpdate.logo);
      throw new Error('Logo media not found in database');
    }

    // Then verify the user link
    const updatedUser = await User.findById(user._id)
      .populate('logo')
      .lean();
    
    console.log('[Media] User logo verification:', {
      updateLogoId: userUpdate.logo.toString(),
      userLogoId: updatedUser.logo?._id?.toString(),
      logoExists: !!logoExists,
      userHasLogo: !!updatedUser.logo
    });

    if (!updatedUser.logo || updatedUser.logo._id.toString() !== userUpdate.logo.toString()) {
      console.error('[Media] Logo link verification failed:', {
        expected: userUpdate.logo,
        actual: updatedUser.logo?._id
      });
      throw new Error('Logo update verification failed - link mismatch');
    }

    console.log('[Media] Logo verification completed successfully');
  }  // Build a clean response based on the type of upload
  if (isProfileUpdate) {
    // For profile updates, ensure user object exists and has required fields
    if (!user) {
      throw new Error('User object is undefined after update');
    }
    
    return {
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        _id: user._id,
        email: user.email,
        companyName: user.companyName,
        logo: user.logo ? getMediaUrl(user.logo.secureId) : null,
        address: user.address || '',
        zipCode: user.zipCode || '',
        city: user.city || '',
        country: user.country || ''
      }
    };
  } else {
    // For media uploads
    return {
      status: 'success',
      message: 'Files uploaded successfully',
      data: {
        _id: user._id,
        email: user.email,
        companyName: user.companyName,
        logo: user.logo ? getMediaUrl(user.logo.secureId) : null,
        media: {
          images: user.images ? user.images.map(img => getMediaUrl(img.secureId)) : [],
          videos: user.videos ? user.videos.map(vid => getMediaUrl(vid.secureId)) : [],
          model3d: user.model3d ? getMediaUrl(user.model3d.secureId) : null
        }
      }
    };
  }
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