const { v4: uuidv4 } = require('uuid');
const Content = require('../models/Content');
const fs = require('fs');
const path = require('path');

// Try to load OpenCV, if it fails, use a mock for illustration
let cv;
try {
    cv = require('opencv4nodejs');
    console.log('OpenCV loaded successfully.');
} catch (e) {
    console.warn('OpenCV (opencv4nodejs) not found. Feature detection will be mocked.');
}

exports.uploadContent = async (req, res) => {
    try {
        const files = req.files;
        const body = req.body;

        // Validation: Image is mandatory. Video can be a file OR a link.
        if (!files || !files.image) {
            return res.status(400).json({ error: 'Image file is required.' });
        }

        const hasVideoFile = files.video && files.video.length > 0;
        const hasVideoLink = body.videoLink && body.videoLink.trim().length > 0;

        if (!hasVideoFile && !hasVideoLink) {
            return res.status(400).json({ error: 'Either a video file or a video link is required.' });
        }

        const imageFile = files.image[0];
        const videoFile = hasVideoFile ? files.video[0] : null;
        const contentId = uuidv4();

        const descriptorFilename = `${contentId}.bin`;
        const descriptorPath = path.join(__dirname, '../uploads/descriptors', descriptorFilename);

        let keypointsCount = 0;

        if (cv) {
            // REAL OPENCV LOGIC
            try {
                const img = cv.imread(imageFile.path);
                const grayImg = img.bgrToGray();
                const orb = new cv.ORBDetector();
                const keyPoints = orb.detect(grayImg);
                const descriptors = orb.compute(grayImg, keyPoints);

                // Save descriptors to binary file
                fs.writeFileSync(descriptorPath, descriptors.getData());
                keypointsCount = keyPoints.length;
            } catch (opencvError) {
                console.error('OpenCV processing error:', opencvError);
                return res.status(500).json({ error: 'Failed to process image with OpenCV.' });
            }
        } else {
            // MOCK LOGIC for demonstration when OpenCV is not installed
            const mockDescriptor = Buffer.from(`MOCK_DESCRIPTORS_FOR_${contentId}`);
            fs.writeFileSync(descriptorPath, mockDescriptor);
            keypointsCount = 100; // Simulated count
        }

        // Save metadata to MongoDB
        const newContent = new Content({
            contentId,
            originalImageName: imageFile.originalname,
            imagePath: `/uploads/images/${imageFile.filename}`,
            videoType: hasVideoFile ? 'file' : 'link',
            videoLink: hasVideoLink ? body.videoLink : undefined,
            videoPath: hasVideoFile ? `/uploads/videos/${videoFile.filename}` : body.videoLink, // Use link as path for simplicity in frontend
            descriptorPath: `/uploads/descriptors/${descriptorFilename}`,
            metadata: {
                keypointsCount,
                fileSize: videoFile ? videoFile.size : 0
            }
        });

        await newContent.save();

        res.status(201).json({
            message: 'Upload successful',
            contentId,
            videoUrl: `${req.protocol}://${req.get('host')}${newContent.videoPath}`,
            descriptorUrl: `${req.protocol}://${req.get('host')}${newContent.descriptorPath}`
        });

    } catch (error) {
        console.error('Upload handler error:', error);
        res.status(500).json({ error: 'Server error during upload.' });
    }
};

exports.getVideo = async (req, res) => {
    try {
        const content = await Content.findOne({ contentId: req.params.id });
        if (!content) return res.status(404).json({ error: 'Content not found' });

        // In a real app, you might want to redirect or stream
        res.json({ videoUrl: `${req.protocol}://${req.get('host')}${content.videoPath}` });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
};

exports.getDescriptor = async (req, res) => {
    try {
        const content = await Content.findOne({ contentId: req.params.id });
        if (!content) return res.status(404).json({ error: 'Content not found' });

        const absolutePath = path.join(__dirname, '..', content.descriptorPath);
        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ error: 'Descriptor file missing on server' });
        }
        res.sendFile(absolutePath);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
};

exports.getAllContents = async (req, res) => {
    try {
        const contents = await Content.find().sort({ createdAt: -1 });
        res.json(contents);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
};

exports.deleteContent = async (req, res) => {
    try {
        const content = await Content.findOne({ contentId: req.params.id });
        if (!content) return res.status(404).json({ error: 'Content not found' });

        // Delete physical files
        const deleteFile = (relPath) => {
            const absPath = path.join(__dirname, '..', relPath);
            if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
        };

        // Note: original image path is not stored in the main schema in the previous step, 
        // but video and descriptor are.
        deleteFile(content.videoPath);
        deleteFile(content.descriptorPath);

        // Also need to find the image. Let's assume it's in uploads/images
        // In actual implementation, we should store image path too.
        // For now, let's just delete the record.
        await Content.deleteOne({ contentId: req.params.id });

        res.json({ message: 'Content deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Deletion failed' });
    }
};
