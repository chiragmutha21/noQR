const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Ensure upload directories exist
const dirs = ['uploads/images', 'uploads/videos', 'uploads/descriptors'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Static files access
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ar_db';
mongoose.connect(mongoUri)
    .then(() => console.log('MongoDB Connected successfully.'))
    .catch(err => {
        console.error('MongoDB Connection Error:', err.message);
        console.log('Ensure MongoDB is running or update MONGO_URI in .env');
    });

// Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Basic Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`AR Backend Server running on port ${PORT}`);
    console.log(`Upload images to: http://localhost:${PORT}/api/upload`);
});
