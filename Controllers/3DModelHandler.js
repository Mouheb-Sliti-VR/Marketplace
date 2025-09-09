const multer = require('multer');
const path = require('path');
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
    const allowed = {
        '3dmodels': ['model/obj', 'model/gltf+json', 'model/gltf-binary', 'application/x-fbx', 'application/sla', 'application/stl', 'application/octet-stream'],
        'images': ['image/jpeg', 'image/png', 'image/webp']
    };
    const type = file.mimetype.startsWith('image/') ? 'images' : '3dmodels';
    cb(null, allowed[type]?.includes(file.mimetype));
};

// Multer Upload Middleware
const upload = multer({ storage, fileFilter }).fields([
    { name: 'model', maxCount: 1 },
    { name: 'image', maxCount: 1 }
]);

// Save 3D Model Metadata
const save3DModel = async (req) => {
    const { name, description } = req.body;
    const modelFile = req.files?.model?.[0];
    const imageFile = req.files?.image?.[0];

    if (!name || !description || !modelFile || !imageFile) {
        throw new Error('Name, description, model, and image are required.');
    }

    // Validate File Types
    const isModelValid = ['model/gltf-binary', 'model/gltf+json', 'model/obj', 'application/stl'].includes(modelFile.mimetype);
    const isImageValid = ['image/jpeg', 'image/png', 'image/webp'].includes(imageFile.mimetype);

    if (!isModelValid || !isImageValid) {
        throw new Error('Invalid file format: Ensure the model is a .glb/.obj and image is .jpg/.png');
    }

    // Save to DB with file data
    const newModel = new ThreeDModel({
        name,
        description,
        filename: modelFile.originalname,
        modelData: modelFile.buffer,
        imageUrl: `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`
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
            modelUrl: `${BASE_DOMAIN}/api/3d/download/${m._id}`,
            imageUrl: m.imageUrl // Already a data URL
        }))
    };    
};

// Download 3D Model
const download3DModel = async (req, res) => {
    try {
        const model = await ThreeDModel.findById(req.params.modelName);
        if (!model || !model.modelData) {
            return res.status(404).json({ error: 'Model not found' });
        }

        res.setHeader('Content-Type', 'model/gltf-binary');
        res.setHeader('Content-Disposition', `attachment; filename="${model.filename}"`);
        res.send(model.modelData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { upload, save3DModel, getAll3DModels, download3DModel };
