const multer = require('multer');
const path = require('path');
const fs = require('fs').promises; // Use async fs API
const ThreeDModel = require("../Models/ThreeDModel");
const { v4: uuidv4 } = require('uuid'); // Use UUID for unique identifiers

// Set up storage configuration for 3D models using diskStorage
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            const uploadPath = path.join(__dirname, '../uploads/3dmodels');
            
            // Ensure directory exists asynchronously
            await fs.mkdir(uploadPath, { recursive: true });
            cb(null, uploadPath);
        } catch (err) {
            cb(new Error(`Failed to create directory: ${err.message}`));
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4(); // Use UUID to generate unique filenames
        const sanitizedFilename = file.originalname.replace(/\s+/g, '_'); // Replace spaces with underscores for filename sanitization
        cb(null, `${uniqueSuffix}-${sanitizedFilename}`);
    }
});

// File filter for 3D model formats (allow more types if necessary)
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'model/gltf-binary',         // GLB
        'model/obj',                 // OBJ
        'model/gltf+json',           // GLTF (JSON)
        'model/gltf-binary',         // GLTF (Binary)
        'application/x-fbx',         // FBX
        'application/sla',           // STL
        'application/stl',           // STL
        'application/octet-stream',  // Generic binary data
    ];

    // Check if file mimetype is in allowed types
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true); // Accept the file
    } else {
        cb(new Error('Invalid file type'), false); // Reject the file
    }
};

// Configure Multer for uploads
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
});

// Use the upload middleware for single file uploads
const upload3DModel = upload.single('model');

// Save 3D model metadata to database
const save3DModelToDB = async (req) => {
    if (!req.file) {
        throw new Error('No file uploaded.');
    }

    try {
        const threeDModel = new ThreeDModel({
            filename: req.file.filename,
            filepath: req.file.path,
        });

        await threeDModel.save();
        return threeDModel;
    } catch (error) {
        throw new Error(`Failed to save 3D model: ${error.message}`);
    }
};

// Fetch all 3D model URLs
const getAll3DModelURLs = async () => {
    try {
        const models = await ThreeDModel.find(); // Get all models from ThreeDModel
        const baseUrl = 'https://marketplace-1-5g2u.onrender.com/3d/download/';
        
        return models.map(model => ({
            filename: model.filename,
            url: `${baseUrl}${model.filename}`
        }));
    } catch (error) {
        throw new Error(`Failed to fetch model URLs: ${error.message}`);
    }
};

// Function to download a 3D model by filename
const download3DModelByName = async (req, res) => {
    const { modelName } = req.params;

    // Construct the full path to the file based on the location it's stored on the server
    const filePath = path.join(__dirname, '../uploads/3dmodels', modelName);

    console.log('Trying to download model from path:', filePath);  // Debugging log

    try {
        const fileExists = await fs.access(filePath); // Use async fs access to check file existence
        
        if (fileExists) {
            // Serve the file for download
            return res.download(filePath, (err) => {
                if (err) {
                    console.error('Download error:', err);
                    return res.status(500).send('Error downloading the file: ' + err.message);
                }
            });
        }
    } catch (err) {
        console.error(`Model '${modelName}' not found at path:`, filePath);  // Debugging log
        return res.status(404).send(`Model '${modelName}' not found.`);
    }
};

// Export the functions
module.exports = {
    upload3DModel,
    save3DModelToDB,
    getAll3DModelURLs,
    download3DModelByName,
};
