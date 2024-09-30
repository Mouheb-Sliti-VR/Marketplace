const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ThreeDModel = require("../Models/ThreeDModel");

// Set up storage configuration for 3D models using diskStorage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads/3dmodels');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});

// File filter for 3D model formats (allow more types if necessary)
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'model/obj',                 // OBJ
        'model/gltf+json',           // GLTF (JSON)
        'model/gltf-binary',         // GLTF (Binary)
        'application/x-fbx',         // FBX
        'application/sla',           // STL
        'application/stl',           // STL
        'application/octet-stream',   // Generic binary data
        // You can add more MIME types if needed
    ];

    cb(null, allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('model/'));
};

// Configure Multer for uploads
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    // Removed fileSize limit
});

// Use the upload middleware for single file uploads
const upload3DModel = upload.single('model');

// Save 3D model metadata to database
const save3DModelToDB = async (req) => {
    try {
        if (!req.file) {
            throw new Error('No file uploaded.');
        }

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
    const models = await ThreeDModel.find(); // Get all models from ThreeDModel
    const baseUrl = 'https://marketplace-1-5g2u.onrender.com/uploads/3dmodels/';
    
    return models.map(model => ({
        filename: model.filename,
        url: `${baseUrl}${model.filename}`
    }));
};

// Function to download a 3D model by filename
const download3DModelByName = (req, res) => {
    const { modelName } = req.params;
    const filePath = path.join(__dirname, '../uploads/3dmodels', modelName);

    if (fs.existsSync(filePath)) {
        res.download(filePath, (err) => {
            if (err) {
                return res.status(500).send('Error downloading the file: ' + err.message);
            }
        });
    } else {
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
