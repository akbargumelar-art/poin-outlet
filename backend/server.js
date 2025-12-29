
// Load environment variables from .env file
require('dotenv').config();
const path = require('path');
const multer = require('multer');

const express = require('express');
const cors = require('cors');
const db = require('./db');
const authRoutes = require('./routes/auth');
const digiposRoutes = require('./routes/digipos');
const { router: dataRoutes, uploadRouter } = require('./routes/data');

const app = express();

app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api', uploadRouter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/validate-digipos', digiposRoutes);
app.use('/api', dataRoutes);

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date() });
});

app.use('/api/*', (req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
});

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'File terlalu besar. Ukuran maksimal adalah 10MB.' });
    }
    console.error(err.stack);
    res.status(500).json({ message: 'An unexpected error occurred on the server.' });
});

const PORT = process.env.PORT || 4001;

const runSafe = async (connection, label, sql) => {
    try {
        await connection.execute(sql);
        console.log(`[DB Setup] Checked/Created: ${label}`);
    } catch (err) {
        console.error(`[DB Setup] Failed ${label}: ${err.message}`);
    }
};

const setupDatabase = async () => {
    let connection; 
    try {
        connection = await db.getConnection();
        console.log('--- Initializing Database Schema ---');

        await runSafe(connection, 'users', `
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(255) PRIMARY KEY,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'pelanggan', 'supervisor', 'operator') NOT NULL DEFAULT 'pelanggan',
                nama VARCHAR(255),
                email VARCHAR(255),
                phone VARCHAR(50),
                tap VARCHAR(100),
                salesforce VARCHAR(100),
                no_rs VARCHAR(100),
                owner VARCHAR(255),
                kabupaten VARCHAR(100),
                kecamatan VARCHAR(100),
                alamat TEXT,
                jabatan VARCHAR(100),
                photo_url VARCHAR(2048),
                points INT DEFAULT 0,
                level VARCHAR(50) DEFAULT 'Bronze',
                kupon_undian INT DEFAULT 0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await runSafe(connection, 'loyalty_programs', `
            CREATE TABLE IF NOT EXISTS loyalty_programs (
                level VARCHAR(50) PRIMARY KEY,
                pointsNeeded INT DEFAULT 0,
                benefit TEXT,
                multiplier DECIMAL(3,1) DEFAULT 1.0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        
        await runSafe(connection, 'rewards', `
            CREATE TABLE IF NOT EXISTS rewards (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                points INT NOT NULL,
                image_url VARCHAR(2048),
                stock INT DEFAULT 0,
                display_order INT DEFAULT 999
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await runSafe(connection, 'transactions', `
            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(255),
                date DATETIME DEFAULT CURRENT_TIMESTAMP,
                produk VARCHAR(255),
                harga DECIMAL(15,2),
                kuantiti INT,
                total_pembelian DECIMAL(15,2),
                points_earned INT,
                INDEX (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await runSafe(connection, 'redemptions', `
            CREATE TABLE IF NOT EXISTS redemptions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(255),
                reward_id INT,
                points_spent INT,
                date DATETIME DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(50) DEFAULT 'Diajukan',
                status_note TEXT,
                status_updated_at DATETIME,
                documentation_photo_url VARCHAR(2048),
                user_name VARCHAR(255),
                reward_name VARCHAR(255),
                receiver_name VARCHAR(255),
                receiver_role VARCHAR(100),
                surveyor_name VARCHAR(255),
                location_coordinates VARCHAR(100),
                INDEX (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await runSafe(connection, 'running_programs', `
            CREATE TABLE IF NOT EXISTS running_programs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                mechanism TEXT,
                prize_category VARCHAR(100),
                prize_description VARCHAR(255),
                start_date DATE,
                end_date DATE,
                image_url VARCHAR(2048)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await runSafe(connection, 'running_program_targets', `
            CREATE TABLE IF NOT EXISTS running_program_targets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                program_id INT,
                user_id VARCHAR(255),
                progress INT DEFAULT 0,
                UNIQUE KEY unique_target (program_id, user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await runSafe(connection, 'raffle_programs', `
            CREATE TABLE IF NOT EXISTS raffle_programs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                prize VARCHAR(255),
                period VARCHAR(100),
                is_active TINYINT(1) DEFAULT 0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await runSafe(connection, 'raffle_winners', `
            CREATE TABLE IF NOT EXISTS raffle_winners (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255),
                prize VARCHAR(255),
                photo_url VARCHAR(2048),
                period VARCHAR(100)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await runSafe(connection, 'coupon_redemptions', `
            CREATE TABLE IF NOT EXISTS coupon_redemptions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(255),
                raffle_program_id INT,
                redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await runSafe(connection, 'special_numbers', `
            CREATE TABLE IF NOT EXISTS special_numbers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                phone_number VARCHAR(20) NOT NULL UNIQUE,
                price DECIMAL(10,0) NOT NULL,
                is_sold TINYINT(1) DEFAULT 0,
                sn VARCHAR(255),
                lokasi VARCHAR(100)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await runSafe(connection, 'whatsapp_settings', `
            CREATE TABLE IF NOT EXISTS whatsapp_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                webhook_url VARCHAR(255),
                sender_number VARCHAR(50),
                recipient_type VARCHAR(20),
                recipient_id VARCHAR(50),
                api_key VARCHAR(255),
                session_name VARCHAR(50),
                special_number_recipient VARCHAR(50),
                special_number_status_recipient_type ENUM('personal', 'group') DEFAULT 'personal',
                special_number_status_recipient_id VARCHAR(100)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await runSafe(connection, 'digipos_data', `
            CREATE TABLE IF NOT EXISTS digipos_data (
                id_digipos VARCHAR(50) PRIMARY KEY,
                no_rs VARCHAR(50),
                nama_outlet VARCHAR(255),
                salesforce VARCHAR(100),
                tap VARCHAR(100)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

    } catch (err) {
        console.error('Database setup FATAL ERROR:', err);
    } finally {
        if (connection) connection.release();
    }
};

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    setupDatabase().catch(err => console.error(err));
});
