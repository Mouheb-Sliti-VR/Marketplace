require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { uploadFile, saveFileToDB } = require('./fileHandler');
const Media = require('./mediaModel');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.DB_URI;

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));



// Route for uploading files
app.post('/upload', uploadFile, async (req, res) => {
    try {
        const media = await saveFileToDB(req);
        const fileUrl = req.protocol + '://' + req.get('host') + '/files/' + media.filename;
        res.send('File uploaded successfully! URL: ' + fileUrl);
        console.log('File uploaded successfully! URL: ' + fileUrl);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

// Route for downloading media files
app.get('/files/:filename', async (req, res) => {
    const { filename } = req.params;
    try {
        const media = await Media.findOne({ filename });
        if (!media) {
            return res.status(404).send('File not found');
        }
        // Set appropriate content type based on media type
        res.set('Content-Type', media.type);
        // Send the binary data of the media file as the response
        res.send(media.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
