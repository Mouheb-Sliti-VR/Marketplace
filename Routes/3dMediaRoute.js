const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const {uploadFiles,  save3DModelToDB,getAll3DModelData,  download3DModelByName} = require('../Controllers/3DModelHandler');


// Upload 3D Model and save it to the DB
router.post('/upload3dmodel', uploadFiles, async (req, res) => {
    console.log(req.files); 
    try {
        if (!req.files || !req.files.model || !req.files.image) {
            return res.status(400).json({ error: 'Both 3D model and image are required.' });
        }
        const { name, description } = req.body;
        if (!name || !description) {
            return res.status(400).json({ error: 'Name and description are required.' });
        }
        const imageUrl = req.files.image[0] ? `/uploads/images/${req.files.image[0].filename}` : null;
        if (!imageUrl) {
            return res.status(400).json({ error: 'An image URL must be provided.' });
        }
        const result = await save3DModelToDB(req, imageUrl);
        res.status(200).json({ message: '3D model uploaded successfully', model: result });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Fetch all 3D models URLs
router.get('/get3dmodels', async (req, res) => {
    try {
        const models = await getAll3DModelData();
        res.status(200).json(models);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Handle request for downloading a 3D model by name
router.get('/download/:modelName', [
    param('modelName').isString().notEmpty().trim().withMessage('Model name must be a non-empty string')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        await download3DModelByName(req, res);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
