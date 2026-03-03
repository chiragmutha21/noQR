const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const path = require('path');
const fs = require('fs');

// Mock Mongoose
jest.mock('mongoose', () => {
    const mockMongoose = {
        connect: jest.fn().mockResolvedValue(true),
        Schema: jest.fn().mockImplementation(() => ({
            index: jest.fn(),
        })),
        model: jest.fn().mockReturnValue({
            findOne: jest.fn(),
            prototype: {
                save: jest.fn().mockResolvedValue(true),
            },
        }),
        disconnect: jest.fn(),
    };
    return mockMongoose;
});

// Mock Content model
const ContentMock = {
    findOne: jest.fn().mockResolvedValue({
        contentId: 'test-id',
        videoPath: '/uploads/videos/video-123.mp4',
        descriptorPath: 'uploads/descriptors/test-id.bin'
    }),
    prototype: {
        save: jest.fn().mockResolvedValue(true)
    }
};

jest.mock('../models/Content', () => {
    const mock = function (data) {
        return {
            ...data,
            save: jest.fn().mockResolvedValue({ ...data })
        };
    };
    mock.findOne = jest.fn().mockImplementation((query) => {
        if (query.contentId === 'test-id') {
            return {
                contentId: 'test-id',
                videoPath: '/uploads/videos/video-123.mp4',
                descriptorPath: 'uploads/descriptors/test-id.bin'
            };
        }
        return null;
    });
    return mock;
});

let app;

beforeAll(() => {
    app = express();
    app.use(express.json());

    // Create directories if missing
    const dirs = ['uploads/images', 'uploads/videos', 'uploads/descriptors'];
    dirs.forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });

    const apiRoutes = require('../routes/api');
    app.use('/api', apiRoutes);
});

describe('AR Backend Smoke Tests', () => {
    it('POST /api/upload - should handle upload', async () => {
        const testImage = path.join(__dirname, 'test_image.jpg');
        const testVideo = path.join(__dirname, 'test_video.mp4');
        fs.writeFileSync(testImage, 'fake image data');
        fs.writeFileSync(testVideo, 'fake video data');

        const res = await request(app)
            .post('/api/upload')
            .attach('image', testImage)
            .attach('video', testVideo);

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('contentId');

        fs.unlinkSync(testImage);
        fs.unlinkSync(testVideo);
    });

    it('GET /api/video/:id - should return video URL', async () => {
        const res = await request(app).get('/api/video/test-id');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('videoUrl');
    });

    it('GET /api/descriptor/:id - should return descriptor file', async () => {
        // Create a mock descriptor file
        const descPath = path.join(__dirname, '../uploads/descriptors/test-id.bin');
        fs.writeFileSync(descPath, 'fake-descriptor-binary');

        const res = await request(app).get('/api/descriptor/test-id');
        expect(res.statusCode).toBe(200);

        fs.unlinkSync(descPath);
    });
});
