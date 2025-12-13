
const express = require('express');
const router = express.Router();
const uploadRouter = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

// --- Multer Configuration for File Uploads ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper to construct full file URL
const getFileUrl = (req, filename) => {
    if (!filename) return null;
    return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
};

// Helper to normalize object keys (lowercase, underscore instead of space)
// e.g., "ID Digipos" -> "id_digipos", "Tanggal " -> "tanggal"
const normalizeRow = (row) => {
    const newRow = {};
    Object.keys(row).forEach(key => {
        const cleanKey = key.toLowerCase().trim().replace(/ /g, '_');
        newRow[cleanKey] = row[key];
    });
    return newRow;
};

// ==========================================
// UPLOAD ROUTER (Multipart/Form-Data)
// ==========================================

// Upload Transaction Bulk (Excel)
uploadRouter.post('/transactions/bulk', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    
    try {
        // FIX: cellDates: true ensures dates are parsed as JS Date objects, not Excel serial numbers (integers)
        const workbook = xlsx.readFile(req.file.path, { cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        
        let successCount = 0;
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            for (const rawRow of rawData) {
                const row = normalizeRow(rawRow); // Handle "ID Digipos" vs "id_digipos"

                if (!row.id_digipos || !row.produk) continue;
                
                const userId = String(row.id_digipos);
                const harga = Number(row.harga) || 0;
                const kuantiti = Number(row.kuantiti) || 1;
                const total = harga * kuantiti;
                
                // Date Handling
                let date;
                if (row.tanggal instanceof Date) {
                    // It's already a date object thanks to cellDates: true
                    date = row.tanggal;
                    // Adjust for timezone offset if needed (Excel dates are sometimes technically UTC+0 in JS)
                    // Usually not strictly necessary if just storing date, but good practice if times are off.
                    // For now, raw date object is usually closest to what user intended visually in Excel.
                } else if (row.tanggal) {
                    // Fallback for strings
                    date = new Date(row.tanggal);
                } else {
                    date = new Date();
                }

                // Get user multiplier
                const [userRows] = await connection.execute('SELECT level FROM users WHERE id = ?', [userId]);
                let multiplier = 1;
                if (userRows.length > 0) {
                    const level = userRows[0].level;
                    const [progRows] = await connection.execute('SELECT multiplier FROM loyalty_programs WHERE level = ?', [level]);
                    if (progRows.length > 0) multiplier = progRows[0].multiplier;
                }
                
                const points = Math.floor((total / 1000) * multiplier);
                
                await connection.execute(
                    'INSERT INTO transactions (user_id, date, produk, harga, kuantiti, total_pembelian, points_earned) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [userId, date, row.produk, harga, kuantiti, total, points]
                );
                
                await connection.execute(
                    'UPDATE users SET points = points + ? WHERE id = ?',
                    [points, userId]
                );
                successCount++;
            }
            await connection.commit();
            res.json({ message: `Berhasil mengupload ${successCount} transaksi.` });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
            fs.unlinkSync(req.file.path); // Clean up file
        }
    } catch (error) {
        console.error('Bulk transaction error:', error);
        res.status(500).json({ message: 'Gagal memproses file excel. Pastikan format tanggal benar.' });
    }
});

// Update User Profile (with Photo)
uploadRouter.put('/users/:id', upload.single('photo'), async (req, res) => {
    const { id } = req.params;
    let profileData;
    try {
        profileData = JSON.parse(req.body.profile);
    } catch (e) {
        return res.status(400).json({ message: 'Invalid profile data format' });
    }

    const connection = await db.getConnection();
    try {
        let photoUrlPart = '';
        const params = [
            profileData.nama, profileData.email, profileData.phone, 
            profileData.owner, profileData.kabupaten, profileData.kecamatan, 
            profileData.salesforce, profileData.noRs, profileData.alamat, 
            profileData.tap, profileData.jabatan
        ];

        if (req.file) {
            photoUrlPart = ', photo_url = ?';
            params.push(getFileUrl(req, req.file.filename));
        }
        
        params.push(id);

        const sql = `
            UPDATE users SET 
            nama=?, email=?, phone=?, owner=?, kabupaten=?, kecamatan=?, 
            salesforce=?, no_rs=?, alamat=?, tap=?, jabatan=? ${photoUrlPart}
            WHERE id=?
        `;
        
        await connection.execute(sql, params);
        
        // Fetch updated user to return
        const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [id]);
        
        // Construct response object matching frontend types
        const u = rows[0];
        const updatedUser = {
            id: u.id,
            role: u.role,
            points: u.points,
            level: u.level,
            kuponUndian: u.kupon_undian,
            profile: {
                nama: u.nama, email: u.email, phone: u.phone, owner: u.owner,
                kabupaten: u.kabupaten, kecamatan: u.kecamatan, salesforce: u.salesforce,
                noRs: u.no_rs, alamat: u.alamat, tap: u.tap, jabatan: u.jabatan,
                photoUrl: u.photo_url
            }
        };
        
        res.json(updatedUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal update profil' });
    } finally {
        connection.release();
    }
});

// Add/Edit Reward (With Image)
uploadRouter.post('/rewards', upload.single('photo'), async (req, res) => {
    handleRewardSave(req, res);
});
uploadRouter.put('/rewards/:id', upload.single('photo'), async (req, res) => {
    handleRewardSave(req, res, req.params.id);
});

async function handleRewardSave(req, res, id = null) {
    try {
        const data = JSON.parse(req.body.data);
        const fileUrl = req.file ? getFileUrl(req, req.file.filename) : null;
        
        if (id) {
            let sql = 'UPDATE rewards SET name=?, points=?, stock=? WHERE id=?';
            let params = [data.name, data.points, data.stock, id];
            if (fileUrl) {
                sql = 'UPDATE rewards SET name=?, points=?, stock=?, image_url=? WHERE id=?';
                params = [data.name, data.points, data.stock, fileUrl, id];
            }
            await db.execute(sql, params);
        } else {
            if (!fileUrl) return res.status(400).json({message: 'Image is required'});
            await db.execute(
                'INSERT INTO rewards (name, points, stock, image_url, display_order) VALUES (?, ?, ?, ?, 999)',
                [data.name, data.points, data.stock, fileUrl]
            );
        }
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Gagal menyimpan hadiah' });
    }
}

// Add/Edit Running Program (With Image)
uploadRouter.post('/running-programs', upload.single('photo'), async (req, res) => {
    handleProgramSave(req, res);
});
uploadRouter.put('/running-programs/:id', upload.single('photo'), async (req, res) => {
    handleProgramSave(req, res, req.params.id);
});

async function handleProgramSave(req, res, id = null) {
    try {
        const data = JSON.parse(req.body.data);
        const fileUrl = req.file ? getFileUrl(req, req.file.filename) : null;
        
        const commonFields = 'name=?, mechanism=?, prize_category=?, prize_description=?, start_date=?, end_date=?';
        const commonParams = [data.name, data.mechanism, data.prizeCategory, data.prizeDescription, data.startDate, data.endDate];

        if (id) {
            let sql = `UPDATE running_programs SET ${commonFields} WHERE id=?`;
            let params = [...commonParams, id];
            if (fileUrl) {
                sql = `UPDATE running_programs SET ${commonFields}, image_url=? WHERE id=?`;
                params = [...commonParams, fileUrl, id];
            }
            await db.execute(sql, params);
        } else {
            if (!fileUrl) return res.status(400).json({message: 'Image is required'});
            await db.execute(
                'INSERT INTO running_programs (name, mechanism, prize_category, prize_description, start_date, end_date, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [...commonParams, fileUrl]
            );
        }
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Gagal menyimpan program' });
    }
}

// Upload Program Progress
uploadRouter.post('/running-programs/:id/progress', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const { id } = req.params;
    
    try {
        const workbook = xlsx.readFile(req.file.path);
        const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            for (const rawRow of rawData) {
                const row = normalizeRow(rawRow);
                if (row.id_digipos && row.progress !== undefined) {
                    // Upsert target
                    const [existing] = await connection.execute(
                        'SELECT id FROM program_targets WHERE program_id = ? AND user_id = ?',
                        [id, row.id_digipos]
                    );
                    if (existing.length > 0) {
                        await connection.execute(
                            'UPDATE program_targets SET progress = ? WHERE id = ?',
                            [row.progress, existing[0].id]
                        );
                    } else {
                        await connection.execute(
                            'INSERT INTO program_targets (program_id, user_id, progress) VALUES (?, ?, ?)',
                            [id, row.id_digipos, row.progress]
                        );
                    }
                }
            }
            await connection.commit();
            res.json({ message: 'Progress updated' });
        } finally {
            connection.release();
            fs.unlinkSync(req.file.path);
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Failed to process file' });
    }
});

// Bulk Add Program Participants
uploadRouter.post('/running-programs/:id/participants/bulk', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const { id } = req.params;
    
    try {
        const workbook = xlsx.readFile(req.file.path);
        const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            // Clear existing? Maybe not, just add new ones or ensure exist
            // Strategy: Insert ignore or check exist
            for (const rawRow of rawData) {
                const row = normalizeRow(rawRow);
                if (row.id_digipos) {
                    const [existing] = await connection.execute(
                        'SELECT id FROM program_targets WHERE program_id = ? AND user_id = ?',
                        [id, row.id_digipos]
                    );
                    if (existing.length === 0) {
                        await connection.execute(
                            'INSERT INTO program_targets (program_id, user_id, progress) VALUES (?, ?, 0)',
                            [id, row.id_digipos]
                        );
                    }
                }
            }
            await connection.commit();
            res.json({ message: 'Participants added' });
        } finally {
            connection.release();
            fs.unlinkSync(req.file.path);
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Failed to process file' });
    }
});

// Bulk Upload Special Numbers
uploadRouter.post('/special-numbers/bulk', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    
    try {
        const workbook = xlsx.readFile(req.file.path);
        const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            for (const rawRow of rawData) {
                const row = normalizeRow(rawRow);
                // Columns: nomor, harga, sn, lokasi
                if (row.nomor && row.harga) {
                    await connection.execute(
                        `INSERT INTO special_numbers (phone_number, price, sn, lokasi, is_sold) 
                         VALUES (?, ?, ?, ?, 0) 
                         ON DUPLICATE KEY UPDATE price = VALUES(price), sn = VALUES(sn), lokasi = VALUES(lokasi)`,
                        [String(row.nomor), row.harga, row.sn || null, row.lokasi || null]
                    );
                }
            }
            await connection.commit();
            res.json({ message: 'Special numbers uploaded' });
        } finally {
            connection.release();
            fs.unlinkSync(req.file.path);
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Failed to process file' });
    }
});

// Upload Special Number Banner
uploadRouter.post('/special-numbers/banner', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const fileUrl = getFileUrl(req, req.file.filename);
    res.json({ url: fileUrl });
});

// Upload Redemption Documentation
uploadRouter.post('/redemptions/:id/documentation', upload.single('photo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const fileUrl = getFileUrl(req, req.file.filename);
    const { id } = req.params;

    try {
        await db.execute('UPDATE redemptions SET documentation_photo_url = ? WHERE id = ?', [fileUrl, id]);
        res.json({ message: 'Documentation uploaded', url: fileUrl });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Database error' });
    }
});

// Bulk User Level Upload
uploadRouter.post('/users/levels/bulk', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    
    try {
        const workbook = xlsx.readFile(req.file.path);
        const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            for (const rawRow of rawData) {
                const row = normalizeRow(rawRow);
                if (row.id_digipos && row.level) {
                    await connection.execute('UPDATE users SET level = ? WHERE id = ?', [row.level, row.id_digipos]);
                }
            }
            await connection.commit();
            res.json({ message: 'Levels updated' });
        } finally {
            connection.release();
            fs.unlinkSync(req.file.path);
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Failed to process file' });
    }
});


// ==========================================
// DATA ROUTER (JSON API)
// ==========================================

// GET /users
router.get('/users', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM users');
        const users = rows.map(u => ({
            id: u.id,
            role: u.role,
            points: u.points,
            level: u.level,
            kuponUndian: u.kupon_undian,
            profile: {
                nama: u.nama, email: u.email, phone: u.phone, owner: u.owner,
                kabupaten: u.kabupaten, kecamatan: u.kecamatan, salesforce: u.salesforce,
                noRs: u.no_rs, alamat: u.alamat, tap: u.tap, jabatan: u.jabatan,
                photoUrl: u.photo_url
            }
        }));
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// POST /users (Admin Add User)
router.post('/users', async (req, res) => {
    const u = req.body;
    const profile = u.profile;
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(u.password, 10);

    try {
        await db.execute(
            `INSERT INTO users (id, password, role, nama, email, phone, owner, kabupaten, kecamatan, salesforce, no_rs, alamat, tap, jabatan, level, points, kupon_undian)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [u.id, hashedPassword, u.role, profile.nama, profile.email, profile.phone, profile.owner, profile.kabupaten, profile.kecamatan, profile.salesforce, profile.noRs, profile.alamat, profile.tap, profile.jabatan, u.level || 'Bronze', u.points || 0, 0]
        );
        res.status(201).json({ message: 'User created' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating user' });
    }
});

// GET /transactions
router.get('/transactions', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM transactions ORDER BY date DESC');
        const txs = rows.map(t => ({
            id: t.id,
            userId: t.user_id,
            date: t.date,
            produk: t.produk,
            harga: t.harga,
            kuantiti: t.kuantiti,
            totalPembelian: t.total_pembelian,
            pointsEarned: t.points_earned
        }));
        res.json(txs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching transactions' });
    }
});

// POST /transactions
router.post('/transactions', async (req, res) => {
    const { userId, date, produk, harga, kuantiti, totalPembelian } = req.body;
    try {
        const connection = await db.getConnection();
        await connection.beginTransaction();
        
        // Calculate points based on user level
        const [userRows] = await connection.execute('SELECT level FROM users WHERE id = ?', [userId]);
        let multiplier = 1;
        if (userRows.length > 0) {
            const level = userRows[0].level;
            const [progRows] = await connection.execute('SELECT multiplier FROM loyalty_programs WHERE level = ?', [level]);
            if (progRows.length > 0) multiplier = progRows[0].multiplier;
        }
        
        const points = Math.floor((totalPembelian / 1000) * multiplier);

        await connection.execute(
            'INSERT INTO transactions (user_id, date, produk, harga, kuantiti, total_pembelian, points_earned) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, date, produk, harga, kuantiti, totalPembelian, points]
        );
        
        await connection.execute('UPDATE users SET points = points + ? WHERE id = ?', [points, userId]);
        
        await connection.commit();
        connection.release();
        res.json({ message: 'Transaction added' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding transaction' });
    }
});

// GET /rewards
router.get('/rewards', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM rewards ORDER BY display_order ASC');
        const rewards = rows.map(r => ({
            id: r.id,
            name: r.name,
            points: r.points,
            stock: r.stock,
            imageUrl: r.image_url,
            displayOrder: r.display_order
        }));
        res.json(rewards);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching rewards' });
    }
});

// DELETE /rewards/:id
router.delete('/rewards/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM rewards WHERE id = ?', [req.params.id]);
        res.json({ message: 'Reward deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting reward' });
    }
});

// POST /rewards/reorder
router.post('/rewards/reorder', async (req, res) => {
    const { order } = req.body; // [{id: 1, displayOrder: 1}, ...]
    try {
        const connection = await db.getConnection();
        await connection.beginTransaction();
        for (const item of order) {
            await connection.execute('UPDATE rewards SET display_order = ? WHERE id = ?', [item.displayOrder, item.id]);
        }
        await connection.commit();
        connection.release();
        res.json({ message: 'Reordered' });
    } catch (error) {
        res.status(500).json({ message: 'Error reordering' });
    }
});

// GET /redemptions
router.get('/redemptions', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM redemptions ORDER BY date DESC');
        const data = rows.map(r => ({
            id: r.id,
            userId: r.user_id,
            rewardId: r.reward_id,
            rewardName: r.reward_name, // Assuming reward_name is backfilled
            userName: r.user_name,     // Assuming user_name is backfilled
            pointsSpent: r.points_spent,
            date: r.date,
            status: r.status,
            statusNote: r.status_note,
            statusUpdatedAt: r.status_updated_at,
            documentationPhotoUrl: r.documentation_photo_url
        }));
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching redemptions' });
    }
});

// POST /redemptions
router.post('/redemptions', async (req, res) => {
    const { userId, rewardId } = req.body;
    try {
        const connection = await db.getConnection();
        await connection.beginTransaction();

        // Check user points
        const [userRows] = await connection.execute('SELECT points, nama FROM users WHERE id = ?', [userId]);
        if (userRows.length === 0) throw new Error('User not found');
        const user = userRows[0];

        // Check reward
        const [rewardRows] = await connection.execute('SELECT points, stock, name FROM rewards WHERE id = ?', [rewardId]);
        if (rewardRows.length === 0) throw new Error('Reward not found');
        const reward = rewardRows[0];

        if (user.points < reward.points) throw new Error('Poin tidak cukup');
        if (reward.stock <= 0) throw new Error('Stok habis');

        // Deduct points and stock
        await connection.execute('UPDATE users SET points = points - ? WHERE id = ?', [reward.points, userId]);
        await connection.execute('UPDATE rewards SET stock = stock - 1 WHERE id = ?', [rewardId]);

        // If reward is "Kupon Undian", add coupon count to user
        if (reward.name.toLowerCase().includes('kupon') || reward.name.toLowerCase().includes('undian')) {
             await connection.execute('UPDATE users SET kupon_undian = kupon_undian + 1 WHERE id = ?', [userId]);
             // Also log to coupon_redemptions if we have a specific raffle program active
             // For now, simpler logic: just track count in user table
        }

        // Create redemption record with snapshots of names
        await connection.execute(
            'INSERT INTO redemptions (user_id, reward_id, points_spent, date, status, user_name, reward_name) VALUES (?, ?, ?, NOW(), "Diajukan", ?, ?)',
            [userId, rewardId, reward.points, user.nama, reward.name]
        );

        await connection.commit();
        connection.release();
        res.json({ message: 'Redemption successful' });

    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Redemption failed' });
    }
});

// PATCH /redemptions/:id/status
router.patch('/redemptions/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, statusNote } = req.body;
    try {
        await db.execute('UPDATE redemptions SET status = ?, status_note = ?, status_updated_at = NOW() WHERE id = ?', [status, statusNote, id]);
        res.json({ message: 'Status updated' });
    } catch (e) {
        res.status(500).json({ message: 'Error updating status' });
    }
});

// POST /redemptions/bulk/status
router.post('/redemptions/bulk/status', async (req, res) => {
    const { ids, status, statusNote } = req.body; // ids is array of numbers
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'No IDs provided' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        // Dynamically create placeholders for IN clause
        const placeholders = ids.map(() => '?').join(',');
        const sql = `UPDATE redemptions SET status = ?, status_note = ?, status_updated_at = NOW() WHERE id IN (${placeholders})`;
        const params = [status, statusNote, ...ids];
        
        await connection.execute(sql, params);
        await connection.commit();
        
        res.json({ message: `${ids.length} status penukaran berhasil diperbarui.` });
    } catch (e) {
        await connection.rollback();
        console.error(e);
        res.status(500).json({ message: 'Gagal memperbarui status massal.' });
    } finally {
        connection.release();
    }
});

// GET /loyalty-programs
router.get('/loyalty-programs', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM loyalty_programs');
        const programs = rows.map(p => ({
            level: p.level,
            pointsNeeded: p.points_needed,
            benefit: p.benefit,
            multiplier: p.multiplier
        }));
        res.json(programs);
    } catch (e) { res.status(500).json({message: 'Error'}); }
});

// PUT /loyalty-programs/:level
router.put('/loyalty-programs/:level', async (req, res) => {
    const { pointsNeeded, benefit, multiplier } = req.body;
    try {
        await db.execute('UPDATE loyalty_programs SET points_needed=?, benefit=?, multiplier=? WHERE level=?', [pointsNeeded, benefit, multiplier, req.params.level]);
        res.json({message: 'Updated'});
    } catch (e) { res.status(500).json({message: 'Error'}); }
});

// GET /running-programs
router.get('/running-programs', async (req, res) => {
    try {
        const connection = await db.getConnection();
        const [programs] = await connection.query('SELECT * FROM running_programs');
        
        // Fetch targets for each program
        const results = await Promise.all(programs.map(async (p) => {
            const [targets] = await connection.query('SELECT * FROM program_targets WHERE program_id = ?', [p.id]);
            return {
                id: p.id,
                name: p.name,
                mechanism: p.mechanism,
                prizeCategory: p.prize_category,
                prizeDescription: p.prize_description,
                startDate: p.start_date,
                endDate: p.end_date,
                imageUrl: p.image_url,
                targets: targets.map(t => ({
                    id: t.id,
                    programId: t.program_id,
                    userId: t.user_id,
                    progress: t.progress
                }))
            };
        }));
        connection.release();
        res.json(results);
    } catch (e) { res.status(500).json({message: 'Error'}); }
});

// PUT /running-programs/:id/participants
router.put('/running-programs/:id/participants', async (req, res) => {
    const { userIds } = req.body; // Array of user IDs
    const programId = req.params.id;
    
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        // 1. Get current IDs
        const [current] = await connection.execute('SELECT user_id FROM program_targets WHERE program_id = ?', [programId]);
        const currentIds = new Set(current.map(c => c.user_id));
        const newIds = new Set(userIds);
        
        // 2. Delete removed
        for (const uid of currentIds) {
            if (!newIds.has(uid)) {
                await connection.execute('DELETE FROM program_targets WHERE program_id = ? AND user_id = ?', [programId, uid]);
            }
        }
        
        // 3. Add new
        for (const uid of newIds) {
            if (!currentIds.has(uid)) {
                await connection.execute('INSERT INTO program_targets (program_id, user_id, progress) VALUES (?, ?, 0)', [programId, uid]);
            }
        }
        
        await connection.commit();
        res.json({message: 'Participants updated'});
    } catch (e) {
        await connection.rollback();
        console.error(e);
        res.status(500).json({message: 'Error updating participants'});
    } finally {
        connection.release();
    }
});

// DELETE /running-programs/:id
router.delete('/running-programs/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM running_programs WHERE id=?', [req.params.id]);
        res.json({message: 'Deleted'});
    } catch(e) { res.status(500).json({message: 'Error'}); }
});

// GET /raffle-programs
router.get('/raffle-programs', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM raffle_programs');
        const data = rows.map(r => ({
            id: r.id,
            name: r.name,
            prize: r.prize,
            period: r.period,
            isActive: !!r.is_active
        }));
        res.json(data);
    } catch(e) { res.status(500).json({message: 'Error'}); }
});

// POST /raffle-programs
router.post('/raffle-programs', async (req, res) => {
    const { name, prize, period, isActive } = req.body;
    const connection = await db.getConnection();
    try {
        if (isActive) {
            await connection.execute('UPDATE raffle_programs SET is_active = 0');
        }
        await connection.execute('INSERT INTO raffle_programs (name, prize, period, is_active) VALUES (?, ?, ?, ?)', [name, prize, period, isActive ? 1 : 0]);
        res.json({message: 'Created'});
    } catch(e) { console.error(e); res.status(500).json({message: 'Error'}); } finally { connection.release(); }
});

// PUT /raffle-programs/:id
router.put('/raffle-programs/:id', async (req, res) => {
    const { name, prize, period, isActive } = req.body;
    const connection = await db.getConnection();
    try {
        if (isActive) {
            await connection.execute('UPDATE raffle_programs SET is_active = 0');
        }
        await connection.execute('UPDATE raffle_programs SET name=?, prize=?, period=?, is_active=? WHERE id=?', [name, prize, period, isActive ? 1 : 0, req.params.id]);
        res.json({message: 'Updated'});
    } catch(e) { console.error(e); res.status(500).json({message: 'Error'}); } finally { connection.release(); }
});

// DELETE /raffle-programs/:id
router.delete('/raffle-programs/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM raffle_programs WHERE id=?', [req.params.id]);
        res.json({message: 'Deleted'});
    } catch(e) { res.status(500).json({message: 'Error'}); }
});

// GET /raffle-winners (Mock or DB?)
router.get('/raffle-winners', async (req, res) => {
    try {
        const [rows] = await db.query("SHOW TABLES LIKE 'raffle_winners'");
        if (rows.length === 0) return res.json([]);
        
        const [data] = await db.query('SELECT * FROM raffle_winners');
        res.json(data.map(w => ({
            id: w.id,
            name: w.name,
            prize: w.prize,
            photoUrl: w.photo_url,
            period: w.period
        })));
    } catch (e) { res.json([]); }
});

// GET /special-numbers
router.get('/special-numbers', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM special_numbers');
        res.json(rows.map(r => ({
            id: r.id,
            phoneNumber: r.phone_number,
            price: r.price,
            isSold: !!r.is_sold,
            sn: r.sn,
            lokasi: r.lokasi
        })));
    } catch (e) { res.status(500).json({message: 'Error'}); }
});

// POST /special-numbers
router.post('/special-numbers', async (req, res) => {
    const { phoneNumber, price, sn, lokasi } = req.body;
    try {
        await db.execute('INSERT INTO special_numbers (phone_number, price, sn, lokasi) VALUES (?, ?, ?, ?)', [phoneNumber, price, sn, lokasi]);
        res.json({message: 'Added'});
    } catch (e) { res.status(500).json({message: 'Error'}); }
});

// DELETE /special-numbers/:id
router.delete('/special-numbers/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM special_numbers WHERE id=?', [req.params.id]);
        res.json({message: 'Deleted'});
    } catch (e) { res.status(500).json({message: 'Error'}); }
});

// PATCH /special-numbers/:id/status
router.patch('/special-numbers/:id/status', async (req, res) => {
    const { isSold } = req.body;
    try {
        await db.execute('UPDATE special_numbers SET is_sold=? WHERE id=?', [isSold, req.params.id]);
        res.json({message: 'Updated'});
    } catch (e) { res.status(500).json({message: 'Error'}); }
});

// GET /whatsapp-settings
router.get('/whatsapp-settings', async (req, res) => {
    try {
        const [rows] = await db.query("SHOW TABLES LIKE 'whatsapp_settings'");
        if (rows.length === 0) return res.json(null);
        
        const [data] = await db.query('SELECT * FROM whatsapp_settings LIMIT 1');
        if (data.length === 0) return res.json(null);
        
        const s = data[0];
        res.json({
            webhookUrl: s.webhook_url,
            senderNumber: s.sender_number,
            recipientType: s.recipient_type,
            recipientId: s.recipient_id,
            apiKey: s.api_key,
            sessionName: s.session_name,
            specialNumberRecipient: s.special_number_recipient
        });
    } catch(e) { res.json(null); }
});

// PUT /whatsapp-settings
router.put('/whatsapp-settings', async (req, res) => {
    const s = req.body;
    const connection = await db.getConnection();
    try {
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS whatsapp_settings (
                id INT PRIMARY KEY DEFAULT 1,
                webhook_url VARCHAR(255),
                sender_number VARCHAR(50),
                recipient_type VARCHAR(20),
                recipient_id VARCHAR(50),
                api_key VARCHAR(255),
                session_name VARCHAR(100),
                special_number_recipient VARCHAR(50)
            )
        `);
        
        const sql = `
            INSERT INTO whatsapp_settings (id, webhook_url, sender_number, recipient_type, recipient_id, api_key, session_name, special_number_recipient)
            VALUES (1, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            webhook_url=VALUES(webhook_url), sender_number=VALUES(sender_number), recipient_type=VALUES(recipient_type),
            recipient_id=VALUES(recipient_id), api_key=VALUES(api_key), session_name=VALUES(session_name), special_number_recipient=VALUES(special_number_recipient)
        `;
        await connection.execute(sql, [s.webhookUrl, s.senderNumber, s.recipientType, s.recipientId, s.apiKey, s.sessionName, s.specialNumberRecipient]);
        res.json({message: 'Saved'});
    } catch(e) { console.error(e); res.status(500).json({message: 'Error'}); } finally { connection.release(); }
});

// GET /locations
router.get('/locations', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT DISTINCT kabupaten, kecamatan FROM users WHERE kabupaten IS NOT NULL');
        const locs = rows.map((r, i) => ({ id: i, kabupaten: r.kabupaten, kecamatan: r.kecamatan }));
        res.json(locs);
    } catch(e) { res.json([]); }
});

// GET /coupon-redemptions (Stub)
router.get('/coupon-redemptions', async (req, res) => {
    res.json([]);
});

// POST /users/:id/points (Manual Update)
router.post('/users/:id/points', async (req, res) => {
    const { points, action } = req.body;
    const userId = req.params.id;
    try {
        const op = action === 'tambah' ? '+' : '-';
        await db.execute(`UPDATE users SET points = points ${op} ? WHERE id = ?`, [points, userId]);
        
        await db.execute(
            'INSERT INTO transactions (user_id, date, produk, harga, kuantiti, total_pembelian, points_earned) VALUES (?, NOW(), ?, 0, 1, 0, ?)',
            [userId, `Manual Adjustment (${action})`, action === 'tambah' ? points : -points]
        );
        
        res.json({message: 'Points updated'});
    } catch(e) { console.error(e); res.status(500).json({message: 'Error'}); }
});

module.exports = { router, uploadRouter };
