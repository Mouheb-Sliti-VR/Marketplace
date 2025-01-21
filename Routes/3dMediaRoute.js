const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const {
    upload3DModel,
    save3DModelToDB,
    getAll3DModelURLs,
    download3DModelByName
} = require('../Controllers/3DModelHandler');

router.post('/upload3dmodel', upload3DModel, async (req, res) => {
    console.log('Uploaded File:', req.file);  // Log the uploaded file
    try {
        const result = await save3DModelToDB(req);
        res.status(200).json({ message: '3D model uploaded successfully', model: result });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Fetch all 3D model URLs
router.get('/get3dmodels', async (req, res) => {
    try {
        const urls = await getAll3DModelURLs();
        res.status(200).json(urls);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Handle request for downloading a 3D model by its name
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
