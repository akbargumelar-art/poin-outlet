// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const db = require('./db'); // This is the database pool
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');

const app = express();

// Middleware
// Enable Cross-Origin Resource Sharing for all routes
app.use(cors());
// Parse incoming JSON requests
app.use(express.json({ limit: '10mb' })); // Increased limit for potential photo uploads

// API Routes
app.use('/api/auth', authRoutes);
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