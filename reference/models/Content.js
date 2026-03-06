const mongoose = require('mongoose');

const ContentSchema = new mongoose.Schema({
    contentId: { type: String, required: true, unique: true },
    originalImageName: String,
    imagePath: { type: String, required: true },
    videoPath: { type: String }, // Optional if using external link
    videoLink: String, // For YouTube or direct URLs
    videoType: { type: String, enum: ['file', 'link'], default: 'file' },
    descriptorPath: { type: String, required: true },
    metadata: {
        keypointsCount: Number,
        fileSize: Number
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Content', ContentSchema);
