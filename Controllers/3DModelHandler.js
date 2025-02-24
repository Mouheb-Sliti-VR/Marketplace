const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const ThreeDModel = require("../Models/ThreeDModel");
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = path.join(__dirname, '../uploads');
const BASE_URL = 'https://marketplace-1-5g2u.onrender.com';

// Ensure Upload Directory Exists
const ensureDir = async (dir) => fs.access(dir).catch(() => fs.mkdir(dir, { recursive: true }));

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const subDir = file.mimetype.startsWith('image/') ? 'images' : '3dmodels';
        const fullPath = path.join(UPLOAD_DIR, subDir);
        await ensureDir(fullPath);
        cb(null, fullPath);
    },
    filename: (req, file, cb) => cb(null, `${Date.now()}-${uuidv4()}-${file.originalname}`)
});

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

    // Save to DB
    const newModel = new ThreeDModel({
        name,
        description,
        filename: modelFile.filename, // 3D Model file
        imageUrl: `/uploads/images/${imageFile.filename}`, // Image file
    });

    return await newModel.save();
};

// Get All 3D Models
const getAll3DModels = async () => {
    const models = await ThreeDModel.find();
    return {
        models: models.map(m => ({
            name: m.name,
            description: m.description,
            modelUrl: `${BASE_URL}/uploads/3dmodels/${m.filename}`, 
            imageUrl: `${BASE_URL}${m.imageUrl}`
        }))
    };    
};

// Download 3D Model
const download3DModel = async (req, res) => {
    try {
        const filePath = path.join(UPLOAD_DIR, '3dmodels', req.params.modelName);
        await fs.access(filePath);
        res.download(filePath);
    } catch (err) {
        res.status(err.code === 'ENOENT' ? 404 : 500).json({ error: err.message });
    }
};

module.exports = { upload, save3DModel, getAll3DModels, download3DModel };
