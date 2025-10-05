// Load environment variables from .env file
require('dotenv').config();
const path = require('path');

const express = require('express');
const cors = require('cors');
const db = require('./db'); // This is the database pool
const authRoutes = require('./routes/auth');
const digiposRoutes = require('./routes/digipos');
const { router: dataRoutes, uploadRouter } = require('./routes/data');

const app = express();

// Middleware
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- MIDDLEWARE REORDERING TO FIX FILE UPLOADS ---
// 1. Register file upload routes FIRST. These routes use multer and handle multipart/form-data.
app.use('/api', uploadRouter);

// 2. Register body parsers AFTER the upload routes.
//    Increase the limit to 10MB to handle large photo uploads within the form data.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// 3. Register the remaining API routes that expect JSON or urlencoded bodies.
app.use('/api/auth', authRoutes);
app.use('/api/validate-digipos', digiposRoutes);
app.use('/api', dataRoutes);

// If a request starts with /api/ but doesn't match any route, send a 404 response.
app.use('/api/*', (req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
});

// Global error handler - this must be the LAST middleware.
app.use((err, req, res, next) => {
    // Check for Multer's file size error
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'File terlalu besar. Ukuran maksimal adalah 10MB.' });
    }
    console.error(err.stack);
    res.status(500).json({ message: 'An unexpected error occurred on the server.' });
});


const PORT = process.env.PORT || 3001;

// Function to check DB connection and then start the server
const startServer = async () => {
    try {
        const connection = await db.getConnection();
        console.log('Successfully connected to the database.');
        connection.release();
        
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (err) {
        console.error('FATAL: Could not connect to the database. Server is not starting.');
        console.error('Full Error Details:', err);
        process.exit(1); // Exit the process with an error code
    }
};

// Start the server
startServer();