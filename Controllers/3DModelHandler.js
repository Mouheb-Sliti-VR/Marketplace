const multer = require('multer');
const path = require('path');
const fs = require('fs').promises; // Async file system API
const ThreeDModel = require("../Models/ThreeDModel");
const { v4: uuidv4 } = require('uuid');

// Define upload directory
const uploadPath = path.join(__dirname, '../uploads');
const LocalbaseUrl ='http://localhost:3000'; 
const RenderURL ='https://marketplace-1-5g2u.onrender.com'; 


// Ensure directories exist
const ensureDirectoryExists = async (dirPath) => {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
};

// Multer storage configuration
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const subFolder = file.mimetype.startsWith('image/') ? 'images' : '3dmodels';
        const fullPath = path.join(uploadPath, subFolder);
        await ensureDirectoryExists(fullPath);
        cb(null, fullPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${uuidv4()}-${file.originalname}`);
    }
});

// File filters
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = {
        '3dmodels': ['model/obj', 'model/gltf+json', 'model/gltf-binary', 'application/x-fbx', 'application/sla', 'application/stl', 'application/octet-stream'],
        'images': ['image/jpeg', 'image/png', 'image/webp']
    };
    
    const fileType = file.mimetype.startsWith('image/') ? 'images' : '3dmodels';
    cb(null, allowedMimeTypes[fileType].includes(file.mimetype));
};

// Multer upload middleware
const upload = multer({ storage, fileFilter });

const uploadFiles = upload.fields([
    { name: 'model', maxCount: 1 },
    { name: 'image', maxCount: 1 }
]);

// Save 3D model metadata
const save3DModelToDB = async (req, imageUrl) => {
    const { name, description } = req.body;
    const modelData = {
        name: name,
        description: description,
        filename: req.files.model[0].filename,
        filepath: req.files.model[0].path, 
        imageUrl: imageUrl, 
    };

    try {
        const model = new ThreeDModel(modelData);
        await model.save();
        return model;
    } catch (error) {
        throw new Error('Error saving the 3D model: ' + error.message);
    }
};

// Fetch all 3D models with metadata and structured payload
const getAll3DModelData = async () => {
    try {
        const models = await ThreeDModel.find(); 

        const Ai3DModels = models.map(model => ({
            name: model.name,
            description: model.description,
            modelUrl: `${RenderURL}/uploads/3dmodels/${model.filename}`,
            imageUrl: `${RenderURL}${model.imageUrl}`,
        }));

        return {Ai3DModels};
    } catch (error) {
        throw new Error(`Failed to fetch models: ${error.message}`);
    }
};

// Download a 3D model by filename
const download3DModelByName = async (req, res) => {
    try {
        const filePath = path.join(uploadPath, '3dmodels', req.params.modelName);
        await fs.access(filePath); 
        res.download(filePath);
    } catch (err) {
        res.status(err.code === 'ENOENT' ? 404 : 500).send(`Error: ${err.message}`);
    }
};

module.exports = {
    uploadFiles,
    save3DModelToDB,
    getAll3DModelData,
    download3DModelByName,
};
