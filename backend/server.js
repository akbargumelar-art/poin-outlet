// Load environment variables from .env file
require('dotenv').config();
const path = require('path');
const multer = require('multer'); // Required for error handling instance check

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
    // Check for Express's body-parser error for large payloads
    if (err.type === 'entity.too.large') {
         return res.status(413).json({ message: 'Request terlalu besar. Ukuran maksimal adalah 10MB.' });
    }
    console.error(err.stack);
    res.status(500).json({ message: 'An unexpected error occurred on the server.' });
});


const PORT = process.env.PORT || 3001;

// Function to check and set up the database schema
const setupDatabase = async () => {
    const connection = await db.getConnection();
    try {
        console.log('Checking database schema...');
        
        // --- Check for special_numbers table ---
        const [tables] = await connection.execute("SHOW TABLES LIKE 'special_numbers'");
        if (tables.length === 0) {
            console.log("Table 'special_numbers' not found. Creating it...");
            const createTableQuery = `
                CREATE TABLE \`special_numbers\` (
                  \`id\` int(11) NOT NULL AUTO_INCREMENT,
                  \`phone_number\` varchar(20) NOT NULL,
                  \`price\` decimal(10,0) NOT NULL,
                  \`is_sold\` tinyint(1) NOT NULL DEFAULT 0,
                  \`sn\` varchar(255) DEFAULT NULL,
                  \`lokasi\` varchar(100) DEFAULT NULL,
                  PRIMARY KEY (\`id\`),
                  UNIQUE KEY \`phone_number_unique\` (\`phone_number\`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
            `;
            await connection.execute(createTableQuery);
            console.log("Table 'special_numbers' created successfully.");
        } else {
             console.log("Table 'special_numbers' already exists.");
        }

        // --- Check for 'operator' role in users table ---
        const [userColumns] = await connection.execute("SHOW COLUMNS FROM users LIKE 'role'");
        if (userColumns.length > 0) {
            const roleColumn = userColumns[0];
            // Type will be like "enum('admin','pelanggan','supervisor')"
            const currentEnumValues = roleColumn.Type.match(/'(.*?)'/g)?.map(v => v.replace(/'/g, '')) || [];
            
            if (!currentEnumValues.includes('operator')) {
                console.log("Column 'users.role' is missing 'operator' value. Altering table...");
                // Note: Ensure all existing and new roles are included in the ENUM list.
                const alterQuery = "ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'pelanggan', 'supervisor', 'operator') NOT NULL";
                await connection.execute(alterQuery);
                console.log("Table 'users' altered successfully to include 'operator' role.");
            } else {
                console.log("Column 'users.role' already includes 'operator' role.");
            }
        }
        
        // --- Check for display_order in rewards table ---
        const [rewardColumns] = await connection.execute("SHOW COLUMNS FROM rewards LIKE 'display_order'");
        if (rewardColumns.length === 0) {
            console.log("Column 'rewards.display_order' not found. Creating it...");
            const alterQuery = "ALTER TABLE rewards ADD COLUMN display_order INT NOT NULL DEFAULT 999 AFTER stock";
            await connection.execute(alterQuery);
            console.log("Table 'rewards' altered successfully to include 'display_order'.");
        } else {
            console.log("Column 'rewards.display_order' already exists.");
        }

        // --- Check for status columns in redemptions table ---
        const [redemptionColumnsStatus] = await connection.execute("SHOW COLUMNS FROM redemptions LIKE 'status'");
        if (redemptionColumnsStatus.length === 0) {
            console.log("Columns 'status', 'status_note', 'status_updated_at' not found in 'redemptions'. Altering table...");
            const alterQuery = `
                ALTER TABLE redemptions
                ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Diajukan' AFTER points_spent,
                ADD COLUMN status_note TEXT DEFAULT NULL AFTER status,
                ADD COLUMN status_updated_at DATETIME DEFAULT NULL AFTER status_note;
            `;
            await connection.execute(alterQuery);
            console.log("Table 'redemptions' altered successfully for status.");
        } else {
            console.log("Status columns already exist in 'redemptions'.");
        }

        // --- Check for user_name and reward_name in redemptions table ---
        const [redemptionColumnsNames] = await connection.execute("SHOW COLUMNS FROM redemptions LIKE 'user_name'");
        if (redemptionColumnsNames.length === 0) {
            console.log("Columns 'user_name' and 'reward_name' not found in 'redemptions'. Altering table...");
            const alterQuery = `
                ALTER TABLE redemptions
                ADD COLUMN user_name VARCHAR(255) NULL AFTER user_id,
                ADD COLUMN reward_name VARCHAR(255) NULL AFTER reward_id;
            `;
            await connection.execute(alterQuery);
            console.log("Table 'redemptions' altered successfully for names.");
        } else {
            console.log("Name columns already exist in 'redemptions'.");
        }

        // --- Check for documentation photo url in redemptions table ---
        const [redemptionColumnsDocs] = await connection.execute("SHOW COLUMNS FROM redemptions LIKE 'documentation_photo_url'");
        if (redemptionColumnsDocs.length === 0) {
            console.log("Column 'documentation_photo_url' not found in 'redemptions'. Altering table...");
            const alterQuery = `
                ALTER TABLE redemptions
                ADD COLUMN documentation_photo_url VARCHAR(2048) DEFAULT NULL AFTER status_updated_at;
            `;
            await connection.execute(alterQuery);
            console.log("Table 'redemptions' altered successfully for documentation photo.");
        } else {
            console.log("Documentation photo column already exists in 'redemptions'.");
        }

    } catch (err) {
        console.error('Database setup failed:', err);
        process.exit(1); // Exit if setup fails
    } finally {
        connection.release();
    }
};


// --- Function to backfill names in historical redemption data ---
const backfillRedemptionNames = async () => {
    const connection = await db.getConnection();
    try {
        console.log('Checking for historical redemption records that need name backfilling...');
        const [recordsToUpdate] = await connection.execute(
            "SELECT id, user_id, reward_id FROM redemptions WHERE user_name IS NULL OR reward_name IS NULL"
        );

        if (recordsToUpdate.length === 0) {
            console.log('No records need backfilling. All names are populated.');
            return;
        }

        console.log(`Found ${recordsToUpdate.length} records to backfill. Starting process...`);
        let updatedCount = 0;
        for (const record of recordsToUpdate) {
            const [userRows] = await connection.execute("SELECT nama FROM users WHERE id = ?", [record.user_id]);
            const [rewardRows] = await connection.execute("SELECT name FROM rewards WHERE id = ?", [record.reward_id]);

            const userName = userRows[0]?.nama || null;
            const rewardName = rewardRows[0]?.name || null;

            // Only update if we found at least one name, to avoid unnecessary writes
            if (userName || rewardName) {
                 await connection.execute(
                    "UPDATE redemptions SET user_name = ?, reward_name = ? WHERE id = ?",
                    [userName, rewardName, record.id]
                );
                updatedCount++;
            }
        }
         console.log(`Backfill complete. ${updatedCount} of ${recordsToUpdate.length} records updated.`);

    } catch (err) {
        console.error('Failed during redemption name backfill:', err);
    } finally {
        connection.release();
    }
};


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

// Start the server after ensuring the database is set up and backfilled
setupDatabase().then(() => {
    backfillRedemptionNames().then(() => {
        startServer();
    });
});