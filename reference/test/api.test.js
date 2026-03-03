const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const path = require('path');
const fs = require('fs');

let mongoServer;
let app;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    // Create a fresh app instance for testing
    app = express();
    app.use(express.json());

    // Mock directories
    if (!fs.existsSync('uploads/images')) fs.mkdirSync('uploads/images', { recursive: true });
    if (!fs.existsSync('uploads/videos')) fs.mkdirSync('uploads/videos', { recursive: true });
    if (!fs.existsSync('uploads/descriptors')) fs.mkdirSync('uploads/descriptors', { recursive: true });

    await mongoose.connect(uri);

    const apiRoutes = require('../routes/api');
    app.use('/api', apiRoutes);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('API Endpoints', () => {
    it('should upload image and video and return contentId', async () => {
        // Create dummy files for testing
        const testImage = path.join(__dirname, 'test_image.jpg');
        const testVideo = path.join(__dirname, 'test_video.mp4');
        fs.writeFileSync(testImage, 'dummy image content');
        fs.writeFileSync(testVideo, 'dummy video content');

        const res = await request(app)
            .post('/api/upload')
            .attach('image', testImage)
            .attach('video', testVideo);

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('contentId');
        expect(res.body).toHaveProperty('videoUrl');

        const contentId = res.body.contentId;

        // Test retrieval
        const videoRes = await request(app).get(`/api/video/${contentId}`);
        expect(videoRes.statusCode).toEqual(200);
        expect(videoRes.body.videoUrl).toContain(contentId);

        // Clean up dummy files
        fs.unlinkSync(testImage);
        fs.unlinkSync(testVideo);
    });
});
