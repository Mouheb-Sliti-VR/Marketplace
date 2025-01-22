const multer = require('multer');
const path = require('path');
const fs = require('fs').promises; // Use async fs API
const ThreeDModel = require("../Models/ThreeDModel");
const { v4: uuidv4 } = require('uuid'); // Use UUID for unique identifiers

const upload = multer({
    storage: multer.diskStorage({
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
    }),
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'model/obj', 'model/gltf+json', 'model/gltf-binary',
            'application/x-fbx', 'application/sla', 'application/stl',
            'application/octet-stream'
        ];
        cb(null, allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('model/'));
    },
    // Normalize file paths to Windows-style after upload
    transformFilepath: (req, file) => {
        file.path = file.path.replace(/\//g, '\\');
    }
});

// Use the upload middleware for single file uploads
const upload3DModel = upload.single('model');

// Save 3D model metadata to the database
const save3DModelToDB = async (req) => {
    try {
        if (!req.file) {
            throw new Error('No file uploaded.');
        }

        // Normalize to Windows-style paths
        const normalizedPath = req.file.path.replace(/\//g, '\\');

        const threeDModel = new ThreeDModel({
            filename: req.file.filename,
            filepath: normalizedPath,
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
