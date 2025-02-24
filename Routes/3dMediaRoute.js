const express = require('express');
const { param, validationResult } = require('express-validator');
const router = express.Router();
const { upload, save3DModel, getAll3DModels, download3DModel } = require('../Controllers/3DModelHandler');

// Upload 3D Model
router.post('/upload3dmodel', upload, async (req, res) => {
    try {
        const model = await save3DModel(req);
        res.status(201).json({ message: 'Upload successful', model });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Fetch All 3D Models
router.get('/get3dmodels', async (req, res) => {
    try {
        res.json(await getAll3DModels());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Download 3D Model
router.get('/download/:modelName', param('modelName').isString().trim().notEmpty(), async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    await download3DModel(req, res);
});

module.exports = router;
