const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
let bucket;

// Initialize GridFS bucket
const initBucket = () => {
    if (!bucket) {
        bucket = new GridFSBucket(mongoose.connection.db, {
            bucketName: 'mediaFiles'
        });
    }
    return bucket;
};

// Upload file to GridFS
const uploadToGridFS = (fileBuffer, filename, metadata) => {
    return new Promise((resolve, reject) => {
        const bucket = initBucket();
        const uploadStream = bucket.openUploadStream(filename, {
            metadata
        });

        // Handle upload events
        uploadStream.on('error', reject);
        uploadStream.on('finish', () => {
            resolve(uploadStream.id);
        });

        // Write the buffer to GridFS
        uploadStream.write(fileBuffer);
        uploadStream.end();
    });
};

// Stream file from GridFS
const streamFromGridFS = (fileId) => {
    const bucket = initBucket();
    return bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
};

// Delete file from GridFS
const deleteFromGridFS = async (fileId) => {
    const bucket = initBucket();
    await bucket.delete(new mongoose.Types.ObjectId(fileId));
};

module.exports = {
    uploadToGridFS,
    streamFromGridFS,
    deleteFromGridFS
};