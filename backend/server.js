// Load environment variables from .env file
require('dotenv').config();
const path = require('path');

const express = require('express');
const cors = require('cors');
const db = require('./db'); // This is the database pool
const authRoutes = require('./routes/auth');
const digiposRoutes = require('./routes/digipos'); // 1. IMPORT THE NEW ROUTE
// Import both the data router and the new upload router
const { router: dataRoutes, uploadRouter } = require('./routes/data');

const app = express();

// Middleware
// Enable Cross-Origin Resource Sharing for all routes
app.use(cors());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- MIDDLEWARE REORDERING TO FIX FILE UPLOADS ---
// 1. Register file upload routes FIRST. These routes use multer and handle multipart/form-data.
//    They do not need the JSON body parser.
app.use('/api', uploadRouter);

// 2. Register the JSON body parser AFTER the upload routes. This prevents it from
//    interfering with multipart/form-data requests.
app.use(express.json({ limit: '10mb' })); // Increased limit for potential photo uploads

// 3. Register the remaining API routes that expect JSON bodies.
app.use('/api/auth', authRoutes);
app.use('/api/validate-digipos', digiposRoutes); // 2. REGISTER THE ROUTE AT THE CORRECT PATH
app.use('/api', dataRoutes);

// If a request starts with /api/ but doesn't match any route, send a 404 response.
app.use('/api/*', (req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
});

// NOTE: All frontend serving logic has been removed. 
// Nginx is now responsible for serving the static files from the 'dist' directory.

// Global error handler - this must be the LAST middleware.
app.use((err, req, res, next) => {
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