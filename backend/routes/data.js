const express = require('express');
const db = require('../db');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const router = express.Router();

// --- MULTER CONFIG FOR FILE UPLOADS ---
const setupMulter = (subfolder) => {
    const uploadDir = path.join(__dirname, `../uploads/${subfolder}`);
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, `${subfolder.slice(0, -1)}-${req.params.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
        }
    });

    return multer({
        storage: storage,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
        fileFilter: (req, file, cb) => {
            const filetypes = /jpeg|jpg|png|gif|webp/;
            const mimetype = filetypes.test(file.mimetype);
            const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
            if (mimetype && extname) {
                return cb(null, true);
            }
            cb(new Error("Error: File upload only supports the following filetypes - " + filetypes));
        }
    });
};

const profileUpload = setupMulter('profiles');
const rewardUpload = setupMulter('rewards');
const programUpload = setupMulter('programs');

// Multer config for Excel file uploads
const progressUpload = multer({
    storage: multer.memoryStorage(), // Use memory to avoid writing temp files
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.xlsx', '.xls'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) are allowed.'));
        }
    }
});

const transactionUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.xlsx', '.xls'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) are allowed.'));
        }
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
            console.warn(`Warning: Table not found for query: ${query.substring(0, 50)}... Returning empty array.`);
            return [];
        }
        // Re-throw the error to be caught by the endpoint's main try-catch block
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
            safeQueryDB('SELECT r.*, rw.name as reward_name FROM redemptions r LEFT JOIN rewards rw ON r.reward_id = rw.id ORDER BY r.date DESC'),
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
            redemptionHistory: parsedRedemptions.map(r => ({ ...toCamelCase(r), rewardName: r.reward_name || 'Hadiah Dihapus' })),
            loyaltyPrograms: parsedLoyalty.map(l => toCamelCase(l)),
            runningPrograms: programsWithTargets,
            rafflePrograms: rafflePrograms.map(r => ({ ...toCamelCase(r), isActive: !!r.is_active })),
            couponRedemptions: couponRedemptions.map(c => toCamelCase(c)),
            raffleWinners: raffleWinners.map(w => toCamelCase(w)),
            locations: locations.map(l => toCamelCase(l)),
        });
    } catch (error) {
        // --- IMPROVED ERROR LOGGING ---
        console.error('--- BOOTSTRAP API ERROR ---');
        console.error(`Timestamp: ${new Date().toISOString()}`);
        console.error('Error Message:', error.message);
        console.error('Error Code:', error.code); // e.g., ER_BAD_FIELD_ERROR
        console.error('SQL State:', error.sqlState);
        console.error('Stack Trace:', error.stack);
        console.error('--- END OF ERROR ---');
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
        const data = toCamelCase(rows[0]);
        res.json({ ...data, isRegistered: !!data.isRegistered });
    } catch (error) {
        console.error('Digipos info error:', error);
        res.status(500).json({ message: 'Gagal mengambil informasi outlet.' });
    }
});


// UPDATE USER PROFILE (TEXT FIELDS)
router.put('/users/:id/profile', async (req, res) => {
    const { id } = req.params;
    const profile = req.body;

    if (!profile || !profile.nama || !profile.email || !profile.phone) {
        return res.status(400).json({ message: "Data profil tidak lengkap." });
    }

    try {
        const [userRows] = await db.execute('SELECT role FROM users WHERE id = ?', [id]);
        if (userRows.length === 0) {
            return res.status(404).json({ message: "User tidak ditemukan." });
        }
        const isPelanggan = userRows[0].role === 'pelanggan';

        const fieldsToUpdate = {
            nama: profile.nama,
            email: profile.email,
            phone: profile.phone,
            alamat: profile.alamat,
            tap: profile.tap,
        };
        
        if (isPelanggan) {
            fieldsToUpdate.owner = profile.owner;
            fieldsToUpdate.kabupaten = profile.kabupaten;
            fieldsToUpdate.kecamatan = profile.kecamatan;
            fieldsToUpdate.salesforce = profile.salesforce;
        } else {
            fieldsToUpdate.jabatan = profile.jabatan;
        }

        const fieldNames = Object.keys(fieldsToUpdate);
        const fieldValues = Object.values(fieldsToUpdate);
        const setClause = fieldNames.map(name => `${name.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)} = ?`).join(', ');

        const sql = `UPDATE users SET ${setClause} WHERE id = ?`;
        await db.execute(sql, [...fieldValues, id]);
        
        const [updatedUserRows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
        res.json(structureUser(updatedUserRows[0]));

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Gagal memperbarui profil.' });
    }
});


// UPLOAD USER PHOTO
router.post('/users/:id/photo', profileUpload.single('profilePhoto'), async (req, res) => {
    const { id } = req.params;
    if (!req.file) {
        return res.status(400).json({ message: "File tidak ditemukan." });
    }
    
    const photoUrl = `/uploads/profiles/${req.file.filename}`;

    try {
        await db.execute('UPDATE users SET photo_url = ? WHERE id = ?', [photoUrl, id]);
        res.json({ message: 'Foto profil berhasil diunggah.', photoUrl });
    } catch (error) {
        console.error('Photo upload DB error:', error);
        res.status(500).json({ message: 'Gagal menyimpan path foto ke database.' });
    }
});

// MANUAL POINT ADJUSTMENT
router.post('/users/:id/points', async (req, res) => {
    const { id } = req.params;
    const { points, action } = req.body; // action can be 'tambah' or 'kurang'

    if (!points || !action || typeof points !== 'number' || points <= 0) {
        return res.status(400).json({ message: 'Jumlah poin dan aksi (tambah/kurang) dibutuhkan.' });
    }

    try {
        const operator = action === 'tambah' ? '+' : '-';
        const sql = `UPDATE users SET points = GREATEST(0, points ${operator} ?) WHERE id = ?`;
        
        const [result] = await db.execute(sql, [points, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User tidak ditemukan.' });
        }
        
        const [updatedUser] = await db.execute('SELECT points FROM users WHERE id = ?', [id]);

        res.json({ message: 'Poin berhasil diperbarui.', newPoints: updatedUser[0].points });

    } catch (error) {
        console.error('Update points error:', error);
        res.status(500).json({ message: 'Gagal memperbarui poin.' });
    }
});


// CREATE A NEW USER (ADMIN)
router.post('/users', async (req, res) => {
    const { id, password, role, profile } = req.body;
    
    if (!id || !password || !role || !profile || !profile.nama) {
        return res.status(400).json({ message: 'Data user tidak lengkap.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [existingUser] = await connection.execute('SELECT id FROM users WHERE id = ?', [id]);
        if (existingUser.length > 0) {
            throw new Error(`ID/Username '${id}' sudah digunakan.`);
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const isPelanggan = role === 'pelanggan';

        const sql = `
            INSERT INTO users 
            (id, password, role, nama, email, phone, tap, 
            ${isPelanggan ? 'no_rs, owner, salesforce, kabupaten, kecamatan, alamat, level, points, kupon_undian' : 'jabatan'})
            VALUES (?, ?, ?, ?, ?, ?, ?, ${isPelanggan ? '?, ?, ?, ?, ?, ?, ?, ?, ?' : '?'})
        `;
        
        const params = [
            id, hashedPassword, role, profile.nama, profile.email, profile.phone, profile.tap
        ];

        if (isPelanggan) {
            params.push(
                profile.noRs || null,
                profile.owner || null,
                profile.salesforce || null,
                profile.kabupaten || null,
                profile.kecamatan || null,
                profile.alamat || null,
                'Bronze', // Default level
                0, // Default points
                0 // Default kupon
            );
        } else { // admin or supervisor
            params.push(profile.jabatan || null);
        }
        
        await connection.execute(sql, params);
        await connection.commit();

        const [newUserRows] = await connection.execute('SELECT * FROM users WHERE id = ?', [id]);
        res.status(201).json(structureUser(newUserRows[0]));

    } catch (error) {
        await connection.rollback();
        console.error('Admin add user error:', error);
        res.status(400).json({ message: error.message || 'Gagal menambahkan user.' });
    } finally {
        connection.release();
    }
});


// Endpoint untuk menambah transaksi
router.post('/transactions', async (req, res) => {
    const { userId, date, produk, harga, kuantiti, totalPembelian } = req.body;

    if (!userId || !date || !produk || !harga || !kuantiti) {
        return res.status(400).json({ message: "Data transaksi tidak lengkap." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get user's current level and multiplier
        const [userRows] = await connection.execute('SELECT level FROM users WHERE id = ?', [userId]);
        if (userRows.length === 0) throw new Error("User tidak ditemukan.");
        
        const [levelRows] = await connection.execute('SELECT multiplier FROM loyalty_programs WHERE level = ?', [userRows[0].level]);
        const multiplier = levelRows[0]?.multiplier || 1.0;

        // 2. Calculate points
        const pointsEarned = Math.floor((totalPembelian / 1000) * multiplier);

        // 3. Insert transaction
        await connection.execute(
            'INSERT INTO transactions (user_id, date, produk, harga, kuantiti, total_pembelian, points_earned) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, date, produk, harga, kuantiti, totalPembelian, pointsEarned]
        );

        // 4. Update user points
        await connection.execute(
            'UPDATE users SET points = points + ? WHERE id = ?',
            [pointsEarned, userId]
        );

        await connection.commit();
        res.status(201).json({ message: "Transaksi berhasil ditambahkan.", pointsEarned });

    } catch (error) {
        await connection.rollback();
        console.error('Add transaction error:', error);
        res.status(500).json({ message: "Gagal menambah transaksi." });
    } finally {
        connection.release();
    }
});

// BULK TRANSACTION UPLOAD
router.post('/transactions/bulk', transactionUpload.single('transactionsFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'File tidak ditemukan.' });
    }

    const connection = await db.getConnection();
    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet, { cellDates: true });

        if (data.length === 0) {
            return res.status(400).json({ message: 'File Excel kosong atau format tidak sesuai.' });
        }

        const headers = Object.keys(data[0]);
        const requiredHeaders = ['tanggal', 'id_digipos', 'produk', 'harga', 'kuantiti'];
        if (!requiredHeaders.every(h => headers.includes(h))) {
            return res.status(400).json({ message: `File Excel harus memiliki kolom: ${requiredHeaders.join(', ')}.` });
        }
        
        await connection.beginTransaction();

        let successCount = 0;
        let failCount = 0;
        const errors = [];

        const [levels] = await connection.execute('SELECT level, multiplier FROM loyalty_programs');
        const multiplierMap = new Map(levels.map(l => [l.level, l.multiplier]));

        const [users] = await connection.execute('SELECT id, level FROM users');
        const userLevelMap = new Map(users.map(u => [u.id, u.level]));

        for (const row of data) {
            const userId = row.id_digipos;
            const dateObj = row.tanggal instanceof Date ? row.tanggal : new Date(row.tanggal);
            const date = dateObj.toISOString().split('T')[0];
            const produk = row.produk;
            const harga = parseFloat(row.harga);
            const kuantiti = parseInt(row.kuantiti, 10);

            if (!userId || !date || !produk || isNaN(harga) || isNaN(kuantiti)) {
                failCount++;
                errors.push(`Baris tidak valid untuk ID: ${userId || 'KOSONG'}`);
                continue;
            }

            const userLevel = userLevelMap.get(userId);
            if (!userLevel) {
                failCount++;
                errors.push(`User dengan ID ${userId} tidak ditemukan.`);
                continue;
            }

            const multiplier = multiplierMap.get(userLevel) || 1.0;
            const totalPembelian = harga * kuantiti;
            const pointsEarned = Math.floor((totalPembelian / 1000) * multiplier);

            await connection.execute(
                'INSERT INTO transactions (user_id, date, produk, harga, kuantiti, total_pembelian, points_earned) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, date, produk, harga, kuantiti, totalPembelian, pointsEarned]
            );
            await connection.execute(
                'UPDATE users SET points = points + ? WHERE id = ?',
                [pointsEarned, userId]
            );
            successCount++;
        }
        
        await connection.commit();
        res.status(200).json({
            message: `Proses selesai. ${successCount} transaksi berhasil ditambahkan, ${failCount} gagal.`,
            successCount,
            failCount,
            errors
        });
    } catch (error) {
        await connection.rollback();
        console.error('Bulk transaction upload error:', error);
        res.status(500).json({ message: 'Gagal memproses file.', error: error.message });
    } finally {
        connection.release();
    }
});


// Endpoint untuk penukaran poin
router.post('/redemptions', async (req, res) => {
    const { userId, rewardId, pointsSpent, isKupon } = req.body;

    if (!userId || !rewardId || !pointsSpent) {
        return res.status(400).json({ message: "Data penukaran tidak lengkap." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Check user points and reward stock
        const [userRows] = await connection.execute('SELECT points FROM users WHERE id = ?', [userId]);
        if (userRows.length === 0) throw new Error("User tidak ditemukan.");
        if (userRows[0].points < pointsSpent) throw new Error("Poin tidak cukup.");

        const [rewardRows] = await connection.execute('SELECT stock FROM rewards WHERE id = ?', [rewardId]);
        if (rewardRows.length === 0) throw new Error("Hadiah tidak ditemukan.");
        if (rewardRows[0].stock <= 0) throw new Error("Stok hadiah habis.");
        
        // 2. Insert redemption record
        await connection.execute(
            'INSERT INTO redemptions (user_id, reward_id, points_spent, date) VALUES (?, ?, ?, NOW())',
            [userId, rewardId, pointsSpent]
        );

        // 3. Decrement user points
        let sql = 'UPDATE users SET points = points - ?';
        const params = [pointsSpent];
        
        // 4. If it's a raffle coupon, increment user's coupon count
        if (isKupon) {
            const [activeRaffle] = await connection.execute('SELECT id FROM raffle_programs WHERE is_active = 1');
            if (activeRaffle.length > 0) {
                 await connection.execute(
                    'INSERT INTO coupon_redemptions (user_id, raffle_program_id) VALUES (?, ?)',
                    [userId, activeRaffle[0].id]
                );
                sql += ', kupon_undian = kupon_undian + 1';
            }
        }
        
        sql += ' WHERE id = ?';
        params.push(userId);
        
        await connection.execute(sql, params);

        // 5. Decrement reward stock
        await connection.execute('UPDATE rewards SET stock = stock - 1 WHERE id = ?', [rewardId]);

        await connection.commit();
        res.status(200).json({ message: "Penukaran berhasil." });

    } catch (error) {
        await connection.rollback();
        console.error("Redemption error:", error);
        res.status(400).json({ message: error.message });
    } finally {
        connection.release();
    }
});


// REWARD MANAGEMENT
router.post('/rewards', async (req, res) => {
    const { name, points, stock } = req.body;
    const imageUrl = '/uploads/rewards/default.png'; // Default image
    const [result] = await db.execute('INSERT INTO rewards (name, points, stock, image_url) VALUES (?, ?, ?, ?)', [name, points, stock, imageUrl]);
    res.status(201).json({ id: result.insertId, name, points, stock, imageUrl });
});

router.put('/rewards/:id', async (req, res) => {
    const { id } = req.params;
    const { name, points, stock } = req.body;
    await db.execute('UPDATE rewards SET name = ?, points = ?, stock = ? WHERE id = ?', [name, points, stock, id]);
    res.json({ id: parseInt(id), name, points, stock });
});

router.delete('/rewards/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute('DELETE FROM rewards WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Hadiah tidak ditemukan.' });
        }
        res.status(200).json({ message: 'Hadiah berhasil dihapus.' });
    } catch (error) {
        console.error('Delete reward error:', error);
        res.status(500).json({ message: 'Gagal menghapus hadiah.' });
    }
});


router.post('/rewards/:id/photo', rewardUpload.single('photo'), async (req, res) => {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: 'File tidak ditemukan.' });
    const imageUrl = `/uploads/rewards/${req.file.filename}`;
    await db.execute('UPDATE rewards SET image_url = ? WHERE id = ?', [imageUrl, id]);
    res.json({ message: 'Upload berhasil', imageUrl });
});

// PROGRAM MANAGEMENT
router.post('/programs', async (req, res) => {
    const { name, mechanism, prizeCategory, prizeDescription, startDate, endDate } = req.body;
    const imageUrl = '/uploads/programs/default.png'; // Default image
    const sql = 'INSERT INTO running_programs (name, mechanism, prize_category, prize_description, start_date, end_date, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const [result] = await db.execute(sql, [name, mechanism, prizeCategory, prizeDescription, startDate, endDate, imageUrl]);
    res.status(201).json({ id: result.insertId, name, mechanism, prizeCategory, prizeDescription, startDate, endDate, imageUrl, targets: [] });
});

router.put('/programs/:id', async (req, res) => {
    const { id } = req.params;
    const { name, mechanism, prizeCategory, prizeDescription, startDate, endDate } = req.body;
    const sql = 'UPDATE running_programs SET name=?, mechanism=?, prize_category=?, prize_description=?, start_date=?, end_date=? WHERE id = ?';
    await db.execute(sql, [name, mechanism, prizeCategory, prizeDescription, startDate, endDate, id]);
    res.json({ id: parseInt(id), name, mechanism, prizeCategory, prizeDescription, startDate, endDate });
});

router.post('/programs/:id/photo', programUpload.single('photo'), async (req, res) => {
    const { id } = req.params;
    if (!req.file) {
        return res.status(400).json({ message: 'File tidak ditemukan.' });
    }
    const imageUrl = `/uploads/programs/${req.file.filename}`;
    try {
        await db.execute('UPDATE running_programs SET image_url = ? WHERE id = ?', [imageUrl, id]);
        res.json({ message: 'Upload berhasil', imageUrl });
    } catch (error) {
        console.error('Program photo upload DB error:', error);
        res.status(500).json({ message: 'Gagal menyimpan path foto program ke database.' });
    }
});

// UPDATE PROGRAM PARTICIPANTS
router.put('/programs/:id/participants', async (req, res) => {
    const { id: programId } = req.params;
    const { participantIds } = req.body;

    if (!Array.isArray(participantIds)) {
        return res.status(400).json({ message: 'Daftar peserta harus berupa array.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Hapus semua peserta lama dari program ini
        await connection.execute('DELETE FROM running_program_targets WHERE program_id = ?', [programId]);

        // 2. Tambahkan semua peserta baru
        if (participantIds.length > 0) {
            const sql = 'INSERT INTO running_program_targets (program_id, user_id, progress) VALUES ?';
            const values = participantIds.map(userId => [programId, userId, 0]); // Default progress 0
            await connection.query(sql, [values]);
        }

        await connection.commit();
        res.json({ message: `Daftar peserta berhasil diperbarui. Total ${participantIds.length} peserta.` });

    } catch (error) {
        await connection.rollback();
        console.error('Update participants error:', error);
        res.status(500).json({ message: 'Gagal memperbarui daftar peserta.', error: error.message });
    } finally {
        connection.release();
    }
});


// UPLOAD PROGRAM PROGRESS
router.post('/programs/:id/progress', progressUpload.single('progressFile'), async (req, res) => {
    const { id: programId } = req.params;
    if (!req.file) {
        return res.status(400).json({ message: 'File tidak ditemukan.' });
    }

    const connection = await db.getConnection();
    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        if (data.length === 0) {
            return res.status(400).json({ message: 'File Excel kosong atau format tidak sesuai.' });
        }

        // Validate headers
        const headers = Object.keys(data[0]);
        if (!headers.includes('id_digipos') || !headers.includes('progress')) {
            return res.status(400).json({ message: "File Excel harus memiliki kolom 'id_digipos' dan 'progress'." });
        }
        
        await connection.beginTransaction();

        let updatedCount = 0;
        let failedCount = 0;
        const failedIds = [];

        for (const row of data) {
            const userId = row.id_digipos;
            const progress = parseInt(row.progress, 10);

            if (!userId || isNaN(progress)) {
                failedCount++;
                failedIds.push(userId || 'ID KOSONG');
                continue; // Skip invalid rows
            }

            const [result] = await connection.execute(
                'UPDATE running_program_targets SET progress = ? WHERE program_id = ? AND user_id = ?',
                [progress, programId, userId]
            );

            if (result.affectedRows > 0) {
                updatedCount++;
            } else {
                failedCount++;
                failedIds.push(userId);
            }
        }
        
        await connection.commit();
        res.json({
            message: `Proses upload selesai. ${updatedCount} progres diperbarui, ${failedCount} gagal (ID tidak terdaftar sebagai peserta).`,
            updated: updatedCount,
            failed: failedCount,
            failedIds: failedIds
        });

    } catch (error) {
        await connection.rollback();
        console.error('Program progress upload error:', error);
        res.status(500).json({ message: 'Gagal memproses file.', error: error.message });
    } finally {
        connection.release();
    }
});

// LOYALTY PROGRAM MANAGEMENT
router.put('/loyalty-programs/:level', async (req, res) => {
    const { level } = req.params;
    const { pointsNeeded, multiplier, benefit } = req.body;
    try {
        const sql = 'UPDATE loyalty_programs SET points_needed = ?, multiplier = ?, benefit = ? WHERE level = ?';
        const [result] = await db.execute(sql, [pointsNeeded, multiplier, benefit, level]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Level loyalitas tidak ditemukan.' });
        }
        res.json({ level, pointsNeeded, multiplier, benefit });
    } catch (error) {
        console.error('Update loyalty program error:', error);
        res.status(500).json({ message: 'Gagal memperbarui level loyalitas.' });
    }
});

// RAFFLE PROGRAM MANAGEMENT
router.post('/raffle-programs', async (req, res) => {
    const { name, prize, period, isActive } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        if (isActive) {
            await connection.execute('UPDATE raffle_programs SET is_active = 0');
        }
        const sql = 'INSERT INTO raffle_programs (name, prize, period, is_active) VALUES (?, ?, ?, ?)';
        const [result] = await connection.execute(sql, [name, prize, period, !!isActive]);
        await connection.commit();
        res.status(201).json({ id: result.insertId, name, prize, period, isActive: !!isActive });
    } catch (error) {
        await connection.rollback();
        console.error('Create raffle program error:', error);
        res.status(500).json({ message: 'Gagal membuat program undian.' });
    } finally {
        connection.release();
    }
});

router.put('/raffle-programs/:id', async (req, res) => {
    const { id } = req.params;
    const { name, prize, period, isActive } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        if (isActive) {
            await connection.execute('UPDATE raffle_programs SET is_active = 0');
        }
        const sql = 'UPDATE raffle_programs SET name = ?, prize = ?, period = ?, is_active = ? WHERE id = ?';
        const [result] = await connection.execute(sql, [name, prize, period, !!isActive, id]);
        if (result.affectedRows === 0) throw new Error('Program undian tidak ditemukan.');
        await connection.commit();
        res.json({ id: parseInt(id, 10), name, prize, period, isActive: !!isActive });
    } catch (error) {
        await connection.rollback();
        console.error('Update raffle program error:', error);
        res.status(error.message === 'Program undian tidak ditemukan.' ? 404 : 500).json({ message: error.message });
    } finally {
        connection.release();
    }
});

router.delete('/raffle-programs/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute('DELETE FROM raffle_programs WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Program undian tidak ditemukan.' });
        }
        res.json({ message: 'Program undian berhasil dihapus.' });
    } catch (error) {
        console.error('Delete raffle program error:', error);
        res.status(500).json({ message: 'Gagal menghapus program undian.' });
    }
});



module.exports = router;
