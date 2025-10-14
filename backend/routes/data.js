const express = require('express');
const db = require('../db');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const axios = require('axios'); // Use axios for reliable HTTP requests

// Create two routers: one for general data, one for file uploads.
const router = express.Router();
const uploadRouter = express.Router();


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
            const entityId = req.params.id || 'setting';
            cb(null, `${subfolder.slice(0, -1)}-${entityId}-${uniqueSuffix}${path.extname(file.originalname)}`);
        }
    });

    return multer({
        storage: storage,
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
        fileFilter: (req, file, cb) => {
            if (file.mimetype.startsWith('image/')) { // Allow any image type
                cb(null, true);
            } else {
                cb(new Error("Error: Hanya file gambar yang diizinkan!"));
            }
        }
    });
};

const profileUpload = setupMulter('profiles');
const rewardUpload = setupMulter('rewards');
const programUpload = setupMulter('programs');
const bannerUpload = setupMulter('banners');


// Multer config for Excel file uploads
const excelUpload = multer({
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


// --- BOOTSTRAP ENDPOINT (on main router) ---

router.get('/bootstrap', async (req, res) => {
    try {
        const [
            users, transactions, rewards, redemptions, loyaltyPrograms, 
            runningPrograms, runningProgramTargets, rafflePrograms, 
            couponRedemptions, raffleWinners, locations, settings, specialNumbers
        ] = await Promise.all([
            safeQueryDB('SELECT * FROM users'),
            safeQueryDB('SELECT * FROM transactions ORDER BY date DESC'),
            safeQueryDB('SELECT * FROM rewards ORDER BY display_order ASC, points ASC'),
            safeQueryDB('SELECT r.*, rw.name as reward_name, u.nama as user_name FROM redemptions r LEFT JOIN rewards rw ON r.reward_id = rw.id LEFT JOIN users u ON r.user_id = u.id ORDER BY r.date DESC'),
            safeQueryDB('SELECT * FROM loyalty_programs ORDER BY points_needed ASC'),
            safeQueryDB('SELECT * FROM running_programs ORDER BY end_date DESC'),
            safeQueryDB('SELECT * FROM running_program_targets'),
            safeQueryDB('SELECT * FROM raffle_programs ORDER BY is_active DESC, id DESC'),
            safeQueryDB('SELECT * FROM coupon_redemptions'),
            safeQueryDB('SELECT * FROM raffle_winners'),
            safeQueryDB('SELECT * FROM locations'),
            safeQueryDB("SELECT setting_key, setting_value FROM settings"),
            safeQueryDB('SELECT * FROM special_numbers ORDER BY price ASC, phone_number ASC'),
        ]);

        const parsedUsers = parseNumerics(users, ['points', 'kupon_undian']);
        const parsedTransactions = parseNumerics(transactions, ['harga', 'kuantiti', 'total_pembelian', 'points_earned']);
        const parsedRewards = parseNumerics(rewards, ['points', 'stock']);
        const parsedRedemptions = parseNumerics(redemptions, ['points_spent']);
        const parsedLoyalty = parseNumerics(loyaltyPrograms, ['points_needed', 'multiplier']);
        const parsedSpecialNumbers = parseNumerics(specialNumbers, ['price']);


        const structuredUsers = parsedUsers.map(structureUser);
        
        const programsWithTargets = runningPrograms.map(p => ({
            ...toCamelCase(p),
            targets: runningProgramTargets
                .filter(t => t.program_id === p.id)
                .map(t => toCamelCase(t))
        }));
        
        const settingsMap = new Map(settings.map(s => [s.setting_key, s.setting_value]));
        const whatsAppSettings = settingsMap.has('whatsapp_config') ? JSON.parse(settingsMap.get('whatsapp_config')) : null;
        const specialNumberBannerUrl = settingsMap.get('special_number_banner_url') || null;


        res.json({
            users: structuredUsers,
            transactions: parsedTransactions.map(t => toCamelCase(t)),
            rewards: parsedRewards.map(r => toCamelCase(r)),
            redemptionHistory: parsedRedemptions.map(r => ({ ...toCamelCase(r), rewardName: r.reward_name || 'Hadiah Dihapus', userName: r.user_name || 'User Dihapus' })),
            loyaltyPrograms: parsedLoyalty.map(l => toCamelCase(l)),
            runningPrograms: programsWithTargets,
            rafflePrograms: rafflePrograms.map(r => ({ ...toCamelCase(r), isActive: !!r.is_active })),
            couponRedemptions: couponRedemptions.map(c => toCamelCase(c)),
            raffleWinners: raffleWinners.map(w => toCamelCase(w)),
            locations: locations.map(l => toCamelCase(l)),
            whatsAppSettings,
            specialNumbers: parsedSpecialNumbers.map(n => ({...toCamelCase(n), isSold: !!n.is_sold})),
            specialNumberBannerUrl,
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

// --- UPLOAD ROUTES (on uploadRouter) ---

// UPLOAD USER PHOTO
uploadRouter.post('/users/:id/photo', profileUpload.single('profilePhoto'), async (req, res) => {
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

// UPLOAD REWARD PHOTO
uploadRouter.post('/rewards/:id/photo', rewardUpload.single('photo'), async (req, res) => {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: 'File tidak ditemukan.' });
    const imageUrl = `/uploads/rewards/${req.file.filename}`;
    await db.execute('UPDATE rewards SET image_url = ? WHERE id = ?', [imageUrl, id]);
    res.json({ message: 'Upload berhasil', imageUrl });
});

// UPLOAD PROGRAM PHOTO
uploadRouter.post('/programs/:id/photo', programUpload.single('photo'), async (req, res) => {
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

// UPLOAD SPECIAL NUMBER BANNER
uploadRouter.post('/settings/special-number-banner', bannerUpload.single('bannerFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "File banner tidak ditemukan." });
    }

    const bannerUrl = `/uploads/banners/${req.file.filename}`;
    
    try {
        const sql = "INSERT INTO settings (setting_key, setting_value) VALUES ('special_number_banner_url', ?) ON DUPLICATE KEY UPDATE setting_value = ?";
        await db.execute(sql, [bannerUrl, bannerUrl]);
        res.json({ message: 'Banner berhasil diunggah.', bannerUrl });
    } catch (error) {
        console.error('Banner upload DB error:', error);
        res.status(500).json({ message: 'Gagal menyimpan URL banner ke database.' });
    }
});

// BULK TRANSACTION UPLOAD
uploadRouter.post('/transactions/bulk', excelUpload.single('transactionsFile'), async (req, res) => {
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
            const userId = String(row.id_digipos);
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

// UPLOAD PROGRAM PROGRESS
uploadRouter.post('/programs/:id/progress', excelUpload.single('progressFile'), async (req, res) => {
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
            const userId = String(row.id_digipos);
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

// BULK PROGRAM PARTICIPANTS UPLOAD
uploadRouter.post('/programs/:id/participants/bulk', excelUpload.single('participantsFile'), async (req, res) => {
    const { id: programId } = req.params;
    if (!req.file) {
        return res.status(400).json({ message: 'File tidak ditemukan.' });
    }

    const connection = await db.getConnection();
    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        if (data.length === 0) {
            return res.status(400).json({ message: 'File Excel kosong.' });
        }

        const headers = Object.keys(data[0]);
        if (!headers.includes('id_digipos')) {
            return res.status(400).json({ message: "File Excel harus memiliki kolom 'id_digipos'." });
        }
        
        const participantIds = data.map(row => String(row.id_digipos)).filter(Boolean);
        if (participantIds.length === 0) {
            return res.status(400).json({ message: 'Tidak ada ID Digipos yang valid di dalam file.' });
        }

        await connection.beginTransaction();

        // 1. Hapus semua peserta lama dari program ini
        await connection.execute('DELETE FROM running_program_targets WHERE program_id = ?', [programId]);

        // 2. Tambahkan semua peserta baru dari file
        const sql = 'INSERT INTO running_program_targets (program_id, user_id, progress) VALUES ?';
        const values = participantIds.map(userId => [programId, userId, 0]); // Default progress 0
        await connection.query(sql, [values]);

        await connection.commit();
        res.json({ message: `Daftar peserta berhasil diganti. Total ${participantIds.length} peserta ditambahkan dari file.` });

    } catch (error) {
        await connection.rollback();
        console.error('Bulk participants upload error:', error);
        // Check for foreign key constraint error, which means an invalid user ID was provided
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
             res.status(400).json({ message: 'Gagal: Satu atau lebih ID Digipos di dalam file tidak terdaftar sebagai user. Semua perubahan dibatalkan.' });
        } else {
            res.status(500).json({ message: 'Gagal memproses file.', error: error.message });
        }
    } finally {
        connection.release();
    }
});


// BULK LEVEL UPDATE
uploadRouter.post('/users/bulk-level-update', excelUpload.single('levelFile'), async (req, res) => {
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

        const headers = Object.keys(data[0]);
        const requiredHeaders = ['id_digipos', 'level'];
        if (!requiredHeaders.every(h => headers.includes(h))) {
            return res.status(400).json({ message: `File Excel harus memiliki kolom: ${requiredHeaders.join(', ')}.` });
        }

        await connection.beginTransaction();

        let successCount = 0;
        const errors = [];

        const [validLevelsRows] = await connection.execute('SELECT level FROM loyalty_programs');
        const validLevels = validLevelsRows.map(l => l.level);

        for (const row of data) {
            const userId = String(row.id_digipos);
            const newLevel = row.level;

            if (!userId || !newLevel) {
                errors.push(`Baris tidak valid: ID atau Level kosong untuk ID: ${userId || 'KOSONG'}`);
                continue;
            }

            if (!validLevels.includes(newLevel)) {
                errors.push(`Level '${newLevel}' tidak valid untuk ID: ${userId}. Level yang valid: ${validLevels.join(', ')}`);
                continue;
            }
            
            const [result] = await connection.execute(
                "UPDATE users SET level = ? WHERE id = ? AND role = 'pelanggan'",
                [newLevel, userId]
            );

            if (result.affectedRows > 0) {
                successCount++;
            } else {
                errors.push(`User dengan ID ${userId} tidak ditemukan atau bukan Mitra Outlet.`);
            }
        }

        if (errors.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                message: `Ditemukan ${errors.length} error. Tidak ada data yang diperbarui. Silakan perbaiki file dan coba lagi.`,
                successCount: 0,
                failCount: data.length,
                errors
            });
        }
        
        await connection.commit();
        res.status(200).json({
            message: `Proses selesai. ${successCount} level mitra berhasil diperbarui.`,
            successCount,
            failCount: errors.length,
            errors
        });

    } catch (error) {
        await connection.rollback();
        console.error('Bulk level update error:', error);
        res.status(500).json({ message: 'Gagal memproses file.', error: error.message });
    } finally {
        connection.release();
    }
});

// BULK SPECIAL NUMBER UPLOAD
uploadRouter.post('/special-numbers/bulk', excelUpload.single('specialNumbersFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'File tidak ditemukan.' });
    }
    const connection = await db.getConnection();
    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        if (data.length === 0) return res.status(400).json({ message: 'File kosong.' });

        const headers = Object.keys(data[0]);
        const required = ['nomor', 'harga'];
        if (!required.every(h => headers.includes(h))) {
            return res.status(400).json({ message: `File harus punya kolom: ${required.join(', ')}` });
        }

        await connection.beginTransaction();
        const errors = [];
        let successCount = 0;
        const insertSql = 'INSERT INTO special_numbers (phone_number, price, sn, lokasi) VALUES ?';
        const values = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const phoneNumber = String(row.nomor).replace(/[^0-9]/g, '');
            const price = parseFloat(row.harga);
            const sn = row.sn ? String(row.sn) : null;
            const lokasi = row.lokasi ? String(row.lokasi) : null;

            if (!phoneNumber || isNaN(price)) {
                errors.push(`Baris ${i + 2}: Nomor atau harga tidak valid.`);
                continue;
            }
            values.push([phoneNumber, price, sn, lokasi]);
        }
        
        if (values.length > 0) {
            const [result] = await connection.query(insertSql, [values]);
            successCount = result.affectedRows;
        }

        if (errors.length > 0) {
             await connection.rollback();
             return res.status(400).json({ message: 'Upload gagal. Ada error di file.', errors });
        }

        await connection.commit();
        res.status(200).json({ message: `Upload berhasil. ${successCount} nomor ditambahkan.` });

    } catch (error) {
        await connection.rollback();
        console.error('Bulk special number upload error:', error);
        res.status(500).json({ message: 'Gagal memproses file.', error: error.message });
    } finally {
        connection.release();
    }
});


// --- JSON API ENDPOINTS (on main router) ---

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

// CHANGE USER PASSWORD
router.post('/users/:id/change-password', async (req, res) => {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: "Password lama dan baru dibutuhkan." });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password baru harus minimal 6 karakter.' });
    }

    try {
        const [rows] = await db.execute('SELECT password FROM users WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User tidak ditemukan.' });
        }
        const user = rows[0];

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(403).json({ message: 'Password lama salah.' });
        }

        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [newHashedPassword, id]);

        res.json({ message: 'Password berhasil diubah.' });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// MANUAL USER LEVEL UPDATE
router.put('/users/:id/level', async (req, res) => {
    const { id } = req.params;
    const { level } = req.body;

    if (!level) {
        return res.status(400).json({ message: 'Level baru dibutuhkan.' });
    }
    
    try {
        const [validLevels] = await db.execute('SELECT level FROM loyalty_programs');
        const allowedLevels = validLevels.map(l => l.level);
        if (!allowedLevels.includes(level)) {
            return res.status(400).json({ message: `Level tidak valid. Pilihan: ${allowedLevels.join(', ')}` });
        }

        const [result] = await db.execute('UPDATE users SET level = ? WHERE id = ?', [level, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User tidak ditemukan.' });
        }

        const [updatedUserRows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
        res.json(structureUser(updatedUserRows[0]));

    } catch (error) {
        console.error('Update user level error:', error);
        res.status(500).json({ message: 'Gagal memperbarui level user.' });
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

// WHATSAPP NOTIFICATION HELPER
const sendWhatsAppNotification = async (userId, userName, userTap, rewardName, pointsSpent) => {
    try {
        const [rows] = await db.execute("SELECT setting_value FROM settings WHERE setting_key = 'whatsapp_config'");
        if (rows.length === 0) {
            console.log("[WAHA NOTIF] WhatsApp settings not configured. Skipping notification.");
            return;
        }

        const settings = JSON.parse(rows[0].setting_value);
        if (!settings.webhookUrl || !settings.apiKey || !settings.recipientId) {
            console.log("[WAHA NOTIF] WAHA settings are incomplete (URL/API Key/Recipient missing). Skipping notification.");
            return;
        }

        // Construct the full URL and payload based on the successful curl test
        const fullUrl = `${settings.webhookUrl}/api/sendText`;
        const tanggal = new Date().toLocaleString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const message = `*🔔 Notifikasi Penukaran Poin 🔔*\n\nOutlet baru saja melakukan penukaran poin:\n\n*Tanggal* : ${tanggal}\n*TAP* : ${userTap || 'N/A'}\n*ID Digipos* : ${userId}\n*Nama Mitra* : ${userName}\n*Poin* : ${pointsSpent.toLocaleString('id-ID')}\n*Hadiah* : ${rewardName}\n\nTerima Kasih`;
        
        let chatId = settings.recipientId;
        if (settings.recipientType === 'personal' && !chatId.endsWith('@c.us') && !chatId.endsWith('@g.us')) {
            chatId = `${chatId}@c.us`;
        }

        const payload = {
            session: "default", // Hardcoded based on successful test
            chatId: chatId,
            text: message       // Use 'text' key as per successful test
        };

        const config = {
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': settings.apiKey
            }
        };

        console.log(`[WAHA NOTIF] Sending to: ${fullUrl}`);
        console.log(`[WAHA NOTIF] Payload: ${JSON.stringify(payload)}`);
        
        await axios.post(fullUrl, payload, config);

        console.log(`[WAHA NOTIF] WAHA notification sent successfully.`);

    } catch (error) {
        console.error("[WAHA NOTIF] Failed to send WAHA notification.");
        if (axios.isAxiosError(error)) {
            console.error(`[WAHA NOTIF] Axios Error: ${error.message}`);
            if (error.response) {
                console.error(`[WAHA NOTIF] Status: ${error.response.status}`);
                console.error(`[WAHA NOTIF] Data: ${JSON.stringify(error.response.data)}`);
                if (error.response.status === 404) {
                    console.error("[WAHA NOTIF] Diagnosis: 404 Not Found. This often means the session name in the URL is wrong, the session is not 'WORKING', or your reverse proxy (e.g., Nginx) is misconfigured.");
                } else if (error.response.status === 401) {
                     console.error("[WAHA NOTIF] Diagnosis: 401 Unauthorized. Your WAHA API Key is incorrect.");
                }
            }
        } else {
             console.error("[WAHA NOTIF] Generic Error:", error);
        }
    }
};

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
        const [userRows] = await connection.execute('SELECT id, nama, tap, points FROM users WHERE id = ?', [userId]);
        if (userRows.length === 0) throw new Error("User tidak ditemukan.");
        if (userRows[0].points < pointsSpent) throw new Error("Poin tidak cukup.");
        const user = userRows[0];
        const userName = user.nama;
        const userTap = user.tap;

        const [rewardRows] = await connection.execute('SELECT name, stock FROM rewards WHERE id = ?', [rewardId]);
        if (rewardRows.length === 0) throw new Error("Hadiah tidak ditemukan.");
        if (rewardRows[0].stock <= 0) throw new Error("Stok hadiah habis.");
        const rewardName = rewardRows[0].name;
        
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
        
        // 6. Get the updated user data to send back to the frontend
        const [updatedUserRows] = await connection.execute('SELECT * FROM users WHERE id = ?', [userId]);

        await connection.commit();
        
        // Send response to user first, then trigger notification
        res.status(200).json({ message: "Penukaran berhasil.", updatedUser: structureUser(updatedUserRows[0]) });

        // Trigger notification asynchronously
        sendWhatsAppNotification(userId, userName, userTap, rewardName, pointsSpent);

    } catch (error) {
        await connection.rollback();
        console.error("Redemption error:", error);
        res.status(400).json({ message: error.message });
    } finally {
        connection.release();
    }
});

router.patch('/redemptions/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, statusNote } = req.body;

    if (!status) {
        return res.status(400).json({ message: "Status is required." });
    }

    try {
        const sql = 'UPDATE redemptions SET status = ?, status_note = ?, status_updated_at = NOW() WHERE id = ?';
        const [result] = await db.execute(sql, [status, statusNote || null, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Redemption record not found.' });
        }

        res.json({ message: 'Redemption status updated successfully.' });

    } catch (error) {
        console.error('Update redemption status error:', error);
        res.status(500).json({ message: 'Failed to update redemption status.' });
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

router.post('/rewards/reorder', async (req, res) => {
    const orderData = req.body; // Expects an array of [{id: number, displayOrder: number}]

    if (!Array.isArray(orderData)) {
        return res.status(400).json({ message: 'Data urutan tidak valid.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        for (const item of orderData) {
            await connection.execute(
                'UPDATE rewards SET display_order = ? WHERE id = ?',
                [item.displayOrder, item.id]
            );
        }

        await connection.commit();
        res.json({ message: 'Urutan hadiah berhasil disimpan.' });
    } catch (error) {
        await connection.rollback();
        console.error('Reorder rewards error:', error);
        res.status(500).json({ message: 'Gagal menyimpan urutan hadiah.' });
    } finally {
        connection.release();
    }
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

router.delete('/programs/:id', async (req, res) => {
    const { id: programId } = req.params;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // First, delete associated targets to avoid foreign key constraint errors
        await connection.execute('DELETE FROM running_program_targets WHERE program_id = ?', [programId]);
        
        // Then, delete the program itself
        const [result] = await connection.execute('DELETE FROM running_programs WHERE id = ?', [programId]);

        if (result.affectedRows === 0) {
            throw new Error('Program tidak ditemukan.');
        }

        await connection.commit();
        res.json({ message: 'Program dan semua data pesertanya berhasil dihapus.' });

    } catch (error) {
        await connection.rollback();
        console.error('Delete program error:', error);
        res.status(error.message === 'Program tidak ditemukan.' ? 404 : 500).json({ message: error.message || 'Gagal menghapus program.' });
    } finally {
        connection.release();
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

// WHATSAPP SETTINGS MANAGEMENT
router.get('/settings/whatsapp', async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT setting_value FROM settings WHERE setting_key = 'whatsapp_config'");
        if (rows.length === 0) {
            return res.json(null); // No settings found
        }
        res.json(JSON.parse(rows[0].setting_value));
    } catch (error) {
        console.error("Get WhatsApp settings error:", error);
        res.status(500).json({ message: "Gagal mengambil pengaturan." });
    }
});

router.post('/settings/whatsapp', async (req, res) => {
    const settings = req.body;
    const settingsValue = JSON.stringify(settings);
    try {
        // Use INSERT ... ON DUPLICATE KEY UPDATE to handle both creation and update
        const sql = "INSERT INTO settings (setting_key, setting_value) VALUES ('whatsapp_config', ?) ON DUPLICATE KEY UPDATE setting_value = ?";
        await db.execute(sql, [settingsValue, settingsValue]);
        res.json({ message: "Pengaturan WhatsApp berhasil disimpan." });
    } catch (error) {
        console.error("Save WhatsApp settings error:", error);
        res.status(500).json({ message: "Gagal menyimpan pengaturan." });
    }
});

// SPECIAL NUMBER MANAGEMENT
router.get('/special-numbers/all', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM special_numbers ORDER BY is_sold ASC, price ASC, phone_number ASC');
        res.json(rows.map(r => ({...toCamelCase(r), isSold: !!r.is_sold})));
    } catch (e) { res.status(500).json({message: e.message}); }
});

router.post('/special-numbers', async (req, res) => {
    const { phoneNumber, price, sn, lokasi } = req.body;
    if (!phoneNumber || !price) return res.status(400).json({message: 'Nomor dan harga dibutuhkan.'});
    try {
        const [result] = await db.execute('INSERT INTO special_numbers (phone_number, price, sn, lokasi) VALUES (?, ?, ?, ?)', [phoneNumber, price, sn || null, lokasi || null]);
        res.status(201).json({ id: result.insertId, phoneNumber, price, isSold: false, sn: sn || null, lokasi: lokasi || null });
    } catch (e) { res.status(500).json({message: e.message}); }
});

router.put('/special-numbers/:id', async (req, res) => {
    const { id } = req.params;
    const { phoneNumber, price, sn, lokasi } = req.body;
    if (!phoneNumber || !price) return res.status(400).json({message: 'Nomor dan harga dibutuhkan.'});
    try {
        await db.execute('UPDATE special_numbers SET phone_number = ?, price = ?, sn = ?, lokasi = ? WHERE id = ?', [phoneNumber, price, sn || null, lokasi || null, id]);
        res.json({ message: 'Nomor berhasil diperbarui.'});
    } catch (e) { res.status(500).json({message: e.message}); }
});

router.patch('/special-numbers/:id/status', async (req, res) => {
    const { id } = req.params;
    const { isSold } = req.body;
    if (typeof isSold !== 'boolean') return res.status(400).json({message: 'Status `isSold` (boolean) dibutuhkan.'});
    try {
        await db.execute('UPDATE special_numbers SET is_sold = ? WHERE id = ?', [isSold, id]);
        res.json({ message: 'Status berhasil diperbarui.'});
    } catch (e) { res.status(500).json({message: e.message}); }
});

router.delete('/special-numbers/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute('DELETE FROM special_numbers WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Nomor tidak ditemukan.'});
        res.json({ message: 'Nomor berhasil dihapus.'});
    } catch (e) { res.status(500).json({message: e.message}); }
});


router.get('/rewards', async (req, res) => {
    const rewards = await safeQueryDB('SELECT * FROM rewards ORDER BY display_order ASC, points ASC');
    const parsedRewards = parseNumerics(rewards, ['points', 'stock']);
    res.json(parsedRewards.map(r => toCamelCase(r)));
});

router.get('/redemptions', async (req, res) => {
    const redemptions = await safeQueryDB('SELECT r.*, rw.name as reward_name, u.nama as user_name FROM redemptions r LEFT JOIN rewards rw ON r.reward_id = rw.id LEFT JOIN users u ON r.user_id = u.id ORDER BY r.date DESC');
    const parsedRedemptions = parseNumerics(redemptions, ['points_spent']);
    res.json(parsedRedemptions.map(r => ({ ...toCamelCase(r), rewardName: r.reward_name || 'Hadiah Dihapus', userName: r.user_name || 'User Dihapus' })));
});


// Export both routers
module.exports = { router, uploadRouter };