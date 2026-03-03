const express = require('express');
const request = require('supertest');
const fs = require('fs');
const path = require('path');

async function runSmokeTest() {
    console.log('Starting Smoke Test...');

    // Setup directories
    ['uploads/images', 'uploads/videos', 'uploads/descriptors'].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    // Mock dependencies before requiring routes
    require('dotenv').config();
    const mongoose = require('mongoose');
    mongoose.connect = () => Promise.resolve();
    mongoose.model = (name) => {
        return class MockModel {
            constructor(data) { Object.assign(this, data); }
            save() { return Promise.resolve(this); }
            static findOne() { return Promise.resolve({ contentId: 'smoke-id', videoPath: '/uploads/videos/test.mp4' }); }
        };
    };

    const app = express();
    app.use(express.json());
    const apiRoutes = require('./routes/api');
    app.use('/api', apiRoutes);

    console.log('Testing Upload...');
    const testImage = 'smoke_test_image.jpg';
    const testVideo = 'smoke_test_video.mp4';
    fs.writeFileSync(testImage, 'fake image');
    fs.writeFileSync(testVideo, 'fake video');

    try {
        const res = await request(app)
            .post('/api/upload')
            .attach('image', testImage)
            .attach('video', testVideo);

        if (res.status === 201) {
            console.log('✅ Upload Test Passed!');
            console.log('Content ID:', res.body.contentId);
        } else {
            console.log('❌ Upload Test Failed with status:', res.status);
            console.log(res.body);
        }
    } catch (err) {
        console.error('❌ Upload Test Errored:', err);
    } finally {
        fs.unlinkSync(testImage);
        fs.unlinkSync(testVideo);
    }

    process.exit(0);
}

runSmokeTest();
