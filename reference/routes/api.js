const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const uploadController = require('../controllers/uploadController');

// Configure Multer for secure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const subfolder = file.fieldname === 'image' ? 'images' : 'videos';
        cb(null, `uploads/${subfolder}/`);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'image') {
        if (!file.mimetype.startsWith('image/')) return cb(new Error('Only images are allowed for image field'), false);
    } else if (file.fieldname === 'video') {
        if (!file.mimetype.startsWith('video/')) return cb(new Error('Only videos are allowed for video field'), false);
    }
    cb(null, true);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Endpoints
router.get('/upload', (req, res) => res.json({ message: 'Upload endpoint is active. Use POST to upload files.' }));
router.post('/upload', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), uploadController.uploadContent);
router.get('/contents', uploadController.getAllContents);
router.get('/video/:id', uploadController.getVideo);
router.get('/descriptor/:id', uploadController.getDescriptor);
router.delete('/content/:id', uploadController.deleteContent);

module.exports = router;
