
// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');

const app = express();

// Middleware
// Enable Cross-Origin Resource Sharing for all routes
app.use(cors());
// Parse incoming JSON requests
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', dataRoutes);

// Simple root route to check if server is running
app.get('/', (req, res) => {
    res.send('Mitra Loyalty Backend is running!');
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
