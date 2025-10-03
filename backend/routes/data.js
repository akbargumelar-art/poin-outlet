

const express = require('express');
const db = require('../db');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// --- MULTER CONFIG FOR FILE UPLOADS ---
const uploadDir = path.join(__dirname, '../uploads/profiles');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `user-${req.params.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Error: File upload only supports the following filetypes - " + filetypes));
    }
});


// --- CONSTANTS & HELPERS ---

const toCamelCase = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  
  const newObj = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    newObj[camelKey] = obj[key];
  }
  return newObj;
};

const structureUser = (dbUser) => ({
    id: dbUser.id,
    role: dbUser.role,
    points: dbUser.points,
    level: dbUser.level,
    kuponUndian: dbUser.kupon_undian,
    profile: {
        nama: dbUser.nama,
        email: dbUser.email,
        phone: dbUser.phone,
        owner: dbUser.owner,
        kabupaten: dbUser.kabupaten,
        kecamatan: dbUser.kecamatan,
        salesforce: dbUser.salesforce,
        noRs: dbUser.no_rs,
        alamat: dbUser.alamat,
        tap: dbUser.tap,
        jabatan: dbUser.jabatan,
        photoUrl: dbUser.photo_url,
    },
});

const safeQueryDB = async (query, params = []) => {
    try {
        const [rows] = await db.execute(query, params);
        return rows;
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return [];
        }
        throw error;
    }
};

const parseNumerics = (data, fields) => {
    return data.map(item => {
        const newItem = { ...item };
        for (const field of fields) {
            if (newItem[field] !== null && newItem[field] !== undefined) {
                newItem[field] = field.includes('harga') || field.includes('total') || field.includes('multiplier')
                    ? parseFloat(newItem[field])
                    : parseInt(newItem[field], 10);
            }
        }
        return newItem;
    });
};


// --- BOOTSTRAP ENDPOINT ---

router.get('/bootstrap', async (req, res) => {
    try {
        const [
            users, transactions, rewards, redemptions, loyaltyPrograms, 
            runningPrograms, runningProgramTargets, rafflePrograms, 
            couponRedemptions, raffleWinners, locations
        ] = await Promise.all([
            safeQueryDB('SELECT * FROM users'),
            safeQueryDB('SELECT * FROM transactions ORDER BY date DESC'),
            safeQueryDB('SELECT * FROM rewards ORDER BY points ASC'),
            safeQueryDB('SELECT r.*, rw.name as reward_name FROM redemptions r JOIN rewards rw ON r.reward_id = rw.id ORDER BY date DESC'),
            safeQueryDB('SELECT * FROM loyalty_programs ORDER BY points_needed ASC'),
            safeQueryDB('SELECT * FROM running_programs ORDER BY end_date DESC'),
            safeQueryDB('SELECT * FROM running_program_targets'),
            safeQueryDB('SELECT * FROM raffle_programs ORDER BY is_active DESC, id DESC'),
            safeQueryDB('SELECT * FROM coupon_redemptions'),
            safeQueryDB('SELECT * FROM raffle_winners'),
            safeQueryDB('SELECT * FROM locations'),
        ]);

        const parsedUsers = parseNumerics(users, ['points', 'kupon_undian']);
        const parsedTransactions = parseNumerics(transactions, ['harga', 'kuantiti', 'total_pembelian', 'points_earned']);
        const parsedRewards = parseNumerics(rewards, ['points', 'stock']);
        const parsedRedemptions = parseNumerics(redemptions, ['points_spent']);
        const parsedLoyalty = parseNumerics(loyaltyPrograms, ['points_needed', 'multiplier']);

        const structuredUsers = parsedUsers.map(structureUser);
        
        const programsWithTargets = runningPrograms.map(p => ({
            ...toCamelCase(p),
            targets: runningProgramTargets
                .filter(t => t.program_id === p.id)
                .map(t => toCamelCase(t))
        }));

        res.json({
            users: structuredUsers,
            transactions: parsedTransactions.map(t => toCamelCase(t)),
            rewards: parsedRewards.map(r => toCamelCase(r)),
            redemptionHistory: parsedRedemptions.map(r => toCamelCase(r)),
            loyaltyPrograms: parsedLoyalty.map(l => toCamelCase(l)),
            runningPrograms: programsWithTargets,
            rafflePrograms: rafflePrograms.map(r => toCamelCase(r)),
            couponRedemptions: couponRedemptions.map(c => toCamelCase(c)),
            raffleWinners: raffleWinners.map(w => toCamelCase(w)),
            locations: locations.map(l => toCamelCase(l)),
        });
    } catch (error) {
        console.error('Bootstrap error:', error);
        res.status(500).json({ message: 'Gagal mengambil data aplikasi.', error: error.message });
    }
});


// --- API ENDPOINTS ---

// GET DIGIPOS INFO
router.get('/digipos-info/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.execute(
            'SELECT id_digipos, no_rs, nama_outlet, tap, salesforce, is_registered FROM digipos_data WHERE id_digipos = ?',
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'ID Digipos tidak ditemukan di master data.' });
        }
        if (rows[0].is_registered) {
            return res.status(409).json({ message: 'ID Digipos sudah terdaftar.' });
        }
        res.json(toCamelCase(rows[0]));
    } catch (error) {
        console.error('Digipos info error:', error);
        res.status(500).json({ message: 'Gagal mengambil informasi outlet.' });
    }
});

// ADD USER (REFACTORED FOR ROBUSTNESS)
router.post('/users', async (req, res) => {
    // ... (omitted for brevity, no changes from previous version)
});

// UPDATE USER PROFILE (TEXT FIELDS)
router.put('/users/:id/profile', async (req, res) => {
    // ... (omitted for brevity, no changes from previous version)
});

// UPLOAD USER PHOTO
router.post('/users/:id/photo', upload.single('profilePhoto'), async (req, res) => {
    const { id } = req.params;
    if (!req.file) {
        return res.status(400).json({ message: "File tidak ditemukan." });
    }
    
    // Construct the URL path that the frontend can use
    const photoUrl = `/uploads/profiles/${req.file.filename}`;

    try {
        await db.execute('UPDATE users SET photo_url = ? WHERE id = ?', [photoUrl, id]);
        res.json({ message: 'Foto profil berhasil diunggah.', photoUrl });
    } catch (error) {
        console.error('Photo upload DB error:', error);
        res.status(500).json({ message: 'Gagal menyimpan path foto ke database.' });
    }
});

// EXPORT USERS
router.get('/users/export', async (req, res) => {
    // ... (omitted for brevity, no changes from previous version)
});

// REWARDS
// ... (omitted for brevity, no changes from previous version)

// REDEMPTIONS (Tukar Poin)
router.post('/redemptions', async (req, res) => {
    // ... (omitted for brevity, no changes from previous version)
});

// TRANSACTIONS
router.post('/transactions', async (req, res) => {
    // ... (omitted for brevity, no changes from previous version)
});

// PROGRAMS
router.post('/programs/:id/progress', async (req, res) => {
    // ... (omitted for brevity, no changes from previous version)
});

module.exports = router;
