//   ../Controllers/fileHandler.js
const multer = require('multer');
const Media = require('../Models/mediaModel');
const User = require('../Models/userModel');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const uploadFile = upload.single('media');
/*------------------------------------------------------*/

const saveFileToDBAndUpdateUser = async (req, fieldName) => {
    if (!req.file) {
        throw new Error('No file uploaded.');
    }

    const media = new Media({
        type: req.file.mimetype.split('/')[0],
        filename: req.file.originalname,
        data: req.file.buffer
    });

    await media.save();

    // Update the user document with the ObjectId of the newly uploaded media
    const update = { [fieldName]: media._id }; // Update the specified field with the ObjectId of the media
    const options = { new: true };

    const user = await User.findOneAndUpdate(
        { email: req.user.email }, // Find the user by their email address
        update,
        options
    );

    if (!user) {
        throw new Error('User not found');
    }

    return ('Upload made successfully ',user);
};

/*------------------------------------------------------*/

async function getLatestMediaURLsForUser(companyName) {
    try {
        const user = await User.findOne({ companyName }).populate('image1').populate('image2').populate('video');
        if (!user) {
            throw new Error('User not found');
        }
        const latestImage1Url = user.image1 ? `${user.image1.filename}` : null;
        const latestImage2Url = user.image2 ? `${user.image2.filename}` : null;
        const latestVideoUrl = user.video ? `https://marketplace-fmjs.onrender.com/media/${user.video.filename}` : null;
        return { latestImage1Url, latestImage2Url, latestVideoUrl };
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports = { uploadFile, saveFileToDBAndUpdateUser, getLatestMediaURLsForUser};
