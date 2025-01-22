const multer = require('multer');
const path = require('path');
const fs = require('fs').promises; // Use async fs API
const ThreeDModel = require("../Models/ThreeDModel");
const { v4: uuidv4 } = require('uuid'); // Use UUID for unique identifiers

// Multer storage configuration
const upload = multer({
    storage: multer.diskStorage({
        destination: async function (req, file, cb) {
            try {
                const uploadPath = path.join(__dirname, '../uploads/3dmodels');
                // Check and create directory if it doesn't exist
                await fs.access(uploadPath).catch(async () => {
                    await fs.mkdir(uploadPath, { recursive: true });
                });
                cb(null, uploadPath);
            } catch (error) {
                console.error('Error setting destination path:', error);
                cb(error);
            }
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = `${Date.now()}-${uuidv4()}-${file.originalname}`;
            cb(null, uniqueSuffix);
        }
    }),
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'model/obj', 'model/gltf+json', 'model/gltf-binary',
            'application/x-fbx', 'application/sla', 'application/stl',
            'application/octet-stream'
        ];
        const isValid = allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('model/');
        cb(null, isValid);
    }
});

// Middleware for single file uploads
const upload3DModel = upload.single('model');

// Save 3D model metadata to the database
const save3DModelToDB = async (req) => {
    try {
        if (!req.file) {
            throw new Error('No file uploaded.');
        }

        // Normalize to Unix-style paths for consistency
        const normalizedPath = path.normalize(req.file.path);

        const threeDModel = new ThreeDModel({
            filename: req.file.filename,
            filepath: normalizedPath,
        });

        await threeDModel.save();
        return threeDModel;
    } catch (error) {
        console.error('Error saving 3D model to DB:', error.message);
        throw new Error(`Failed to save 3D model: ${error.message}`);
    }
};

// Fetch all 3D model URLs
const getAll3DModelURLs = async () => {
    try {
        const models = await ThreeDModel.find();
        const baseUrl = 'https://marketplace-1-5g2u.onrender.com/3d/download/';
        
        return models.map(model => ({
            filename: model.filename,
            url: `${baseUrl}${model.filename}`
        }));
    } catch (error) {
        console.error('Error fetching model URLs:', error.message);
        throw new Error(`Failed to fetch model URLs: ${error.message}`);
    }
};

// Download a 3D model by filename
const download3DModelByName = async (req, res) => {
    const { modelName } = req.params;

    try {
        const filePath = path.join(__dirname, '../uploads/3dmodels', modelName);
        console.log('Attempting to download model from path:', filePath);

        // Check if the file exists
        await fs.access(filePath);

        // Serve the file for download
        return res.download(filePath, (err) => {
            if (err) {
                console.error('Error during file download:', err.message);
                return res.status(500).send('Error downloading the file: ' + err.message);
            }
        });
    } catch (err) {
        console.error(`Error finding model '${modelName}':`, err.message);
        if (err.code === 'ENOENT') {
            return res.status(404).send(`Model '${modelName}' not found.`);
        }
        return res.status(500).send('Error processing download request: ' + err.message);
    }
};

// Export the functions
module.exports = {
    upload3DModel,
    save3DModelToDB,
    getAll3DModelURLs,
    download3DModelByName,
};
