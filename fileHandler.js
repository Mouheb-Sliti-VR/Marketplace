// fileHandler.js
const multer = require('multer');
const Media = require('./mediaModel');

const storage = multer.memoryStorage(); // Store file in memory
const upload = multer({ storage: storage });

const uploadFile = upload.single('file');

const saveFileToDB = async (req) => {
    if (!req.file) {
        throw new Error('No file uploaded.');
    }
    const media = new Media({
        type: req.file.mimetype.split('/')[0],
        filename: req.file.originalname,
        data: req.file.buffer // Store file data as binary buffer
    });
    await media.save();
    return media;
};

module.exports = { uploadFile, saveFileToDB };
