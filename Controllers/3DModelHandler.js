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
    limits: { fileSize: 16 * 1024 * 1024 } // 200MB limit
}).fields([
    { name: 'file', maxCount: 1 },      // Changed from 'model' to 'file'
    { name: 'imageFile', maxCount: 1 }   // Changed from 'image' to 'imageFile'
]);

// Save 3D Model Metadata
const save3DModel = async (req) => {
    const { name, description } = req.body;
    const modelFile = req.files?.file?.[0];
    const imageFile = req.files?.imageFile?.[0];

    if (!name || !description || !modelFile || !imageFile) {
        throw new Error('All fields are required: name, description, file (3D model), and imageFile');
    }

    // Determine correct MIME type based on file extension
    const ext = path.extname(modelFile.originalname).toLowerCase();
    let mimeType = modelFile.mimetype;
    
    switch (ext) {
        case '.glb':
            mimeType = 'model/gltf-binary';
            break;
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
    }

    // Validate File Types
    const isModelValid = ['model/gltf-binary', 'model/gltf+json', 'model/obj', 'application/stl', 'application/sla', 'application/x-fbx'].includes(mimeType);
    const isImageValid = ['image/jpeg', 'image/png', 'image/webp'].includes(imageFile.mimetype);

    if (!isModelValid || !isImageValid) {
        throw new Error('Invalid file format: Ensure the model is a supported format (.glb/.gltf/.obj/.stl/.fbx) and image is .jpg/.png/.webp');
    }

    console.log('Processing files:', {
        modelName: modelFile.originalname,
        imageName: imageFile.originalname,
        modelType: mimeType
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
        modelData: Buffer.from(modelFile.buffer), // Ensure proper Buffer storage
        mimeType: mimeType, // Save the determined MIME type
        imageUrl: `/uploads/images/${uniqueImageFilename}`
    });

    console.log(`Saving 3D model: ${newModel.name} (${newModel.filename})`);
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
        const model = await ThreeDModel.findOne({ filename: filename });
        
        if (!model) {
            return res.status(404).json({ error: 'Model not found' });
        }

        if (!model.modelData || model.modelData.length === 0) {
            return res.status(404).json({ 
                error: 'Model data not found',
                details: 'The model exists but contains no data'
            });
        }

        // Determine correct MIME type based on file extension
        const ext = path.extname(model.filename).toLowerCase();
        let contentType;
        
        switch (ext) {
            case '.glb':
                contentType = 'model/gltf-binary';
                break;
            case '.gltf':
                contentType = 'model/gltf+json';
                break;
            case '.obj':
                contentType = 'model/obj';
                break;
            case '.stl':
                contentType = 'application/sla';
                break;
            case '.fbx':
                contentType = 'application/x-fbx';
                break;
            default:
                contentType = 'application/octet-stream';
        }

        // Ensure proper binary data handling
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${model.filename}"`);
        res.setHeader('Content-Length', model.modelData.length);
        res.setHeader('Content-Transfer-Encoding', 'binary');
        res.setHeader('Accept-Ranges', 'bytes');
        
        console.log(`Downloading ${model.filename} (${contentType})`);
        
        // Send as raw binary buffer
        return res.end(Buffer.from(model.modelData), 'binary');
    } catch (err) {
        console.error('Download error:', err);
        res.status(500).json({ 
            error: 'Failed to download model',
            details: err.message 
        });
    }
};

module.exports = { upload, save3DModel, getAll3DModels, download3DModel };
