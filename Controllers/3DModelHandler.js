const multer = require('multer');
const path = require('path');// Get All 3D Models
const fs = require('fs').promises;
const ThreeDModel = require("../Models/ThreeDModel");
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = path.join(__dirname, '../uploads');
const { BASE_DOMAIN, API_PREFIX } = require('../utils/urlConfig');

// Ensure Upload Directory Exists
const ensureDir = async (dir) => fs.access(dir).catch(() => fs.mkdir(dir, { recursive: true }));

// Multer Storage Configuration
// Use memory storage instead of disk storage
const storage = multer.memoryStorage();

// File Filter
const fileFilter = (req, file, cb) => {
    console.log('Filtering file:', file.originalname, 'mimetype:', file.mimetype);
    
    const allowed = {
        '3dmodels': ['model/obj', 'model/gltf+json', 'model/gltf-binary', 'application/x-fbx', 'application/sla', 'application/stl', 'application/octet-stream'],
        'images': ['image/jpeg', 'image/png', 'image/webp']
    };

    // Handle model files
    if (file.fieldname === 'file') {
        // For GLB files, force the correct mime type
        if (file.originalname.toLowerCase().endsWith('.glb')) {
            file.mimetype = 'model/gltf-binary';
            return cb(null, true);
        }
        // Check other 3D model formats
        const isModelValid = allowed['3dmodels'].includes(file.mimetype);
        return cb(null, isModelValid);
    }
    
    // Handle image files
    if (file.fieldname === 'imageFile') {
        const isImageValid = allowed['images'].includes(file.mimetype);
        return cb(null, isImageValid);
    }

    cb(new Error('Invalid field name or file type'));
};

// Multer Upload Middleware
const upload = multer({ 
    storage, 
    fileFilter,
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
}).fields([
    { name: 'file', maxCount: 1 },      // Changed from 'model' to 'file'
    { name: 'imageFile', maxCount: 1 }   // Changed from 'image' to 'imageFile'
]);

// Save 3D Model Metadata
const save3DModel = async (req) => {
    const { name, description } = req.body;
    const modelFile = req.files?.file?.[0];         // Changed from model to file
    const imageFile = req.files?.imageFile?.[0];     // Changed from image to imageFile

    if (!name || !description || !modelFile || !imageFile) {
        throw new Error('All fields are required: name, description, file (3D model), and imageFile');
    }

    console.log('Files received:', {
        modelFile: modelFile?.originalname,
        imageFile: imageFile?.originalname,
        body: req.body
    });

    // Validate File Types
    const isModelValid = ['model/gltf-binary', 'model/gltf+json', 'model/obj', 'application/stl'].includes(modelFile.mimetype);
    const isImageValid = ['image/jpeg', 'image/png', 'image/webp'].includes(imageFile.mimetype);

    if (!isModelValid || !isImageValid) {
        throw new Error('Invalid file format: Ensure the model is a .glb/.obj and image is .jpg/.png');
    }

    console.log('Processing model file:', {
        name: modelFile.originalname,
        size: modelFile.size,
        mimetype: modelFile.mimetype,
        hasBuffer: !!modelFile.buffer
    });

    // Generate unique filenames with timestamp and uuid
    const uniqueModelFilename = `${Date.now()}-${uuidv4()}-${modelFile.originalname}`;
    const uniqueImageFilename = `${Date.now()}-${uuidv4()}-${imageFile.originalname}`;

    // Ensure image directory exists
    await ensureDir(path.join(UPLOAD_DIR, 'images'));

    // Save image file to disk
    const imagePath = path.join(UPLOAD_DIR, 'images', uniqueImageFilename);
    await fs.writeFile(imagePath, imageFile.buffer);

    // Save to DB with file data
    const newModel = new ThreeDModel({
        name,
        description,
        filename: uniqueModelFilename,
        modelData: modelFile.buffer, // Store the raw buffer
        imageUrl: `/uploads/images/${uniqueImageFilename}` // Store the relative path
    });

    console.log('Model being saved:', {
        name: newModel.name,
        filename: newModel.filename,
        hasModelData: !!newModel.modelData,
        modelDataSize: newModel.modelData?.length,
        imagePath: newModel.imageUrl
    });

    return await newModel.save();
};

// Get All 3D Models
const getAll3DModels = async () => {
    const models = await ThreeDModel.find({}, { modelData: 0 }); // Exclude modelData for listing
    return {
        models: models.map(m => ({
            _id: m._id,
            name: m.name,
            description: m.description,
            modelUrl: `${BASE_DOMAIN}${API_PREFIX}/3d/download/${m.filename}`, // Use filename for download
            imageUrl: m.imageUrl.startsWith('data:') 
                ? m.imageUrl  // Keep data URL as is
                : `${BASE_DOMAIN}${API_PREFIX}${m.imageUrl}` // Add domain and API prefix to path
        }))
    };    
};

// Download 3D Model
const download3DModel = async (req, res) => {
    try {
        const filename = req.params.modelName;
        console.log('Download request for model filename:', filename);
        
        const model = await ThreeDModel.findOne({ filename: filename });
        if (!model) {
            console.log('Model not found in database');
            return res.status(404).json({ error: 'Model not found' });
        }

        console.log('Found model:', {
            id: model._id,
            name: model.name,
            filename: model.filename,
            hasModelData: !!model.modelData,
            modelDataSize: model.modelData?.length
        });

        if (!model.modelData || model.modelData.length === 0) {
            return res.status(404).json({ 
                error: 'Model data not found',
                details: 'The model exists but contains no data'
            });
        }

        // Set correct content type based on file extension
        const contentType = model.filename.toLowerCase().endsWith('.glb') 
            ? 'model/gltf-binary'
            : 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${model.filename}"`);
        res.setHeader('Content-Length', model.modelData.length);
        
        console.log('Sending model data:', {
            filename: model.filename,
            contentType: contentType,
            size: model.modelData.length
        });

        return res.send(model.modelData);
    } catch (err) {
        console.error('Download error:', err);
        res.status(500).json({ 
            error: 'Failed to download model',
            details: err.message 
        });
    }
};

module.exports = { upload, save3DModel, getAll3DModels, download3DModel };
