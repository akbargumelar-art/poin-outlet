

const express = require('express');
const db = require('../db');
const bcrypt = require('bcryptjs');
const router = express.Router();

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
            // This function previously contained a console.warn statement that was
            // causing JSON parsing errors on the client. It has been removed to ensure
            // a clean JSON response stream.
            return [];
        }
        throw error;
    }
};

// Helper function to parse numeric fields
const parseNumerics = (data, fields) => {
    return data.map(item => {
        const newItem = { ...item };
        for (const field of fields) {
            if (newItem[field] !== null && newItem[field] !== undefined) {
                // Use parseFloat for potential decimals, parseInt for integers
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
            safeQueryDB('SELECT * FROM transactions'),
            safeQueryDB('SELECT * FROM rewards'),
            safeQueryDB('SELECT r.*, rw.name as reward_name FROM redemptions r JOIN rewards rw ON r.reward_id = rw.id'),
            safeQueryDB('SELECT * FROM loyalty_programs'),
            safeQueryDB('SELECT * FROM running_programs'),
            safeQueryDB('SELECT * FROM running_program_targets'),
            safeQueryDB('SELECT * FROM raffle_programs'),
            safeQueryDB('SELECT * FROM coupon_redemptions'),
            safeQueryDB('SELECT * FROM raffle_winners'),
            safeQueryDB('SELECT * FROM locations'),
        ]);

        // CORE FIX: Parse all numeric types before sending to frontend
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
    const { id, password, role, profile } = req.body;
    if (!id || !password || !role || !profile || !profile.nama) {
        return res.status(400).json({ message: 'Data pengguna tidak lengkap.' });
    }

    try {
        const [existing] = await db.execute('SELECT id FROM users WHERE id = ?', [id]);
        if (existing.length > 0) {
            return res.status(409).json({ message: 'ID/Username sudah digunakan.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const userData = {
            id,
            password: hashedPassword,
            role,
            nama: profile.nama || null,
            email: profile.email || null,
            phone: profile.phone || null,
            owner: profile.owner || null,
            kabupaten: profile.kabupaten || null,
            kecamatan: profile.kecamatan || null,
            salesforce: profile.salesforce || null,
            no_rs: profile.noRs || null,
            alamat: profile.alamat || null,
            tap: profile.tap || null,
            jabatan: profile.jabatan || null,
            photo_url: profile.photoUrl || null,
            points: role === 'pelanggan' ? 0 : null,
            level: role === 'pelanggan' ? 'Bronze' : null,
            kupon_undian: role === 'pelanggan' ? 0 : null,
        };

        const columns = Object.keys(userData).filter(key => userData[key] !== null);
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map(key => userData[key]);

        const sql = `INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders})`;
        await db.execute(sql, values);

        const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
        res.status(201).json(structureUser(rows[0]));

    } catch (error) {
        console.error('Add user error:', error);
        res.status(500).json({ message: 'Gagal menambahkan pengguna baru.' });
    }
});


// UPDATE USER PROFILE (REFACTORED FOR ROBUSTNESS)
router.put('/users/:id/profile', async (req, res) => {
    const { id } = req.params;
    const profile = req.body;

    const ALL_PROFILE_KEYS = {
        nama: 'nama', email: 'email', phone: 'phone', owner: 'owner', kabupaten: 'kabupaten',
        kecamatan: 'kecamatan', salesforce: 'salesforce', noRs: 'no_rs', alamat: 'alamat',
        tap: 'tap', jabatan: 'jabatan', photoUrl: 'photo_url'
    };

    const fieldsToUpdate = [];
    const values = [];

    for (const key in ALL_PROFILE_KEYS) {
        // Check if the key exists in the request body (even if null or empty string)
        if (profile.hasOwnProperty(key)) {
            fieldsToUpdate.push(`${ALL_PROFILE_KEYS[key]} = ?`);
            values.push(profile[key]);
        }
    }
    
    if (fieldsToUpdate.length === 0) {
        return res.status(400).json({ message: 'Tidak ada data untuk diperbarui.' });
    }

    values.push(id);
    const sql = `UPDATE users SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;

    try {
        await db.execute(sql, values);
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Gagal memperbarui profil.' });
    }
});

// EXPORT USERS
router.get('/users/export', async (req, res) => {
    const { tap, salesforce, search } = req.query;
    try {
        let sql = `
            SELECT 
                u.id, u.nama, u.owner, u.phone, u.tap, u.salesforce, 
                u.level, u.points, u.kupon_undian,
                COALESCE(SUM(t.total_pembelian), 0) as total_pembelian
            FROM users u
            LEFT JOIN transactions t ON u.id = t.user_id
            WHERE u.role = 'pelanggan'
        `;
        const params = [];
        const conditions = [];

        if (tap) { conditions.push('u.tap = ?'); params.push(tap); }
        if (salesforce) { conditions.push('u.salesforce = ?'); params.push(salesforce); }
        if (search) { conditions.push('(u.nama LIKE ? OR u.id LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
        if (conditions.length > 0) { sql += ' AND ' + conditions.join(' AND '); }
        sql += ' GROUP BY u.id ORDER BY u.nama ASC';
        
        const [users] = await db.execute(sql, params);

        if (users.length === 0) { return res.status(404).send('Tidak ada data untuk diekspor dengan filter yang dipilih.'); }

        const csvHeader = ['ID Digipos', 'Nama Outlet', 'Nama Owner', 'No. WhatsApp', 'TAP', 'Salesforce', 'Level', 'Poin', 'Kupon Undian', 'Total Pembelian'].join(',');
        const csvRows = users.map(u => [`"${u.id || ''}"`, `"${u.nama || ''}"`, `"${u.owner || ''}"`, `"${u.phone || ''}"`, `"${u.tap || ''}"`, `"${u.salesforce || ''}"`, `"${u.level || ''}"`, u.points || 0, u.kupon_undian || 0, u.total_pembelian || 0].join(','));
        const csv = [csvHeader, ...csvRows].join('\n');
        
        res.header('Content-Type', 'text/csv');
        res.attachment('mitra_export.csv');
        res.send(csv);

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ message: 'Gagal mengekspor data.' });
    }
});


// REWARDS
router.post('/rewards', async (req, res) => {
    const { name, points, stock, imageUrl } = req.body;
    try {
        const [result] = await db.execute('INSERT INTO rewards (name, points, stock, image_url) VALUES (?, ?, ?, ?)',[name, points, stock, imageUrl]);
        res.status(201).json({ id: result.insertId, name, points, stock, imageUrl });
    } catch (error) { res.status(500).json({ message: 'Gagal menambah hadiah.' }); }
});

router.put('/rewards/:id', async (req, res) => {
    const { id } = req.params;
    const { name, points, stock, imageUrl } = req.body;
    try {
        await db.execute('UPDATE rewards SET name = ?, points = ?, stock = ?, image_url = ? WHERE id = ?', [name, points, stock, imageUrl, id]);
        res.json({ message: 'Reward updated' });
    } catch (error) { res.status(500).json({ message: 'Gagal memperbarui hadiah.' }); }
});

router.delete('/rewards/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM rewards WHERE id = ?', [req.params.id]);
        res.json({ message: 'Reward deleted' });
    } catch (error) { res.status(500).json({ message: 'Gagal menghapus hadiah.' }); }
});


// REDEMPTIONS (Tukar Poin)
router.post('/redemptions', async (req, res) => {
    const { userId, rewardId, pointsSpent, isKupon } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [updateResult] = await connection.execute('UPDATE users SET points = points - ? WHERE id = ? AND points >= ?', [pointsSpent, userId, pointsSpent]);
        if (updateResult.affectedRows === 0) { throw new Error("Poin tidak cukup atau pengguna tidak ditemukan."); }

        const redemptionDate = new Date().toISOString().split('T')[0];
        await connection.execute('INSERT INTO redemptions (user_id, reward_id, points_spent, date) VALUES (?, ?, ?, ?)', [userId, rewardId, pointsSpent, redemptionDate]);
        
        if (isKupon) {
            await connection.execute('UPDATE users SET kupon_undian = kupon_undian + 1 WHERE id = ?', [userId]);
            const [activePrograms] = await connection.execute('SELECT id FROM raffle_programs WHERE is_active = 1 LIMIT 1');
            if (activePrograms.length > 0) {
                await connection.execute('INSERT INTO coupon_redemptions (user_id, raffle_program_id) VALUES (?, ?)', [userId, activePrograms[0].id]);
            }
        } else {
             const [stockUpdateResult] = await connection.execute('UPDATE rewards SET stock = stock - 1 WHERE id = ? AND stock > 0', [rewardId]);
             if (stockUpdateResult.affectedRows === 0) { throw new Error("Stok hadiah habis."); }
        }
        await connection.commit();
        res.status(201).json({ message: 'Redemption successful' });
    } catch (error) {
        await connection.rollback();
        console.error("Redemption Error:", error);
        res.status(500).json({ message: error.message || 'Server error during redemption' });
    } finally { connection.release(); }
});

// TRANSACTIONS
router.post('/transactions', async (req, res) => {
    const { userId, date, produk, harga, kuantiti, totalPembelian } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [users] = await connection.execute('SELECT level FROM users WHERE id = ?', [userId]);
        if (users.length === 0) { return res.status(404).json({ message: 'User not found' }); }
        
        const [programs] = await connection.execute('SELECT multiplier FROM loyalty_programs WHERE level = ?', [users[0].level]);
        const multiplier = programs.length > 0 ? parseFloat(programs[0].multiplier) : 1;
        const pointsEarned = Math.floor((totalPembelian / 1000) * multiplier);

        await connection.execute(`INSERT INTO transactions (user_id, date, produk, harga, kuantiti, total_pembelian, points_earned) VALUES (?, ?, ?, ?, ?, ?, ?)`, [userId, date, produk, harga, kuantiti, totalPembelian, pointsEarned]);
        await connection.execute('UPDATE users SET points = points + ? WHERE id = ?', [pointsEarned, userId]);

        await connection.commit();
        res.status(201).json({ message: 'Transaction added', pointsEarned });
    } catch (error) {
        await connection.rollback();
        console.error("Transaction Error:", error);
        res.status(500).json({ message: 'Gagal menambah transaksi.' });
    } finally { connection.release(); }
});

// PROGRAMS
router.post('/programs/:id/progress', async (req, res) => {
    const { id: programId } = req.params;
    const progressData = req.body;
    if (!Array.isArray(progressData)) { return res.status(400).json({ message: "Invalid data format. Expected an array." }); }

    const connection = await db.getConnection();
    let updatedCount = 0;
    try {
        await connection.beginTransaction();
        for (const item of progressData) {
            const { userId, progress } = item;
            const sql = `INSERT INTO running_program_targets (program_id, user_id, progress) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE progress = VALUES(progress)`;
            const [result] = await connection.execute(sql, [programId, userId, progress]);
            if (result.affectedRows > 0) { updatedCount++; }
        }
        await connection.commit();
        res.json({ message: 'Progress updated successfully.', updatedCount });
    } catch (error) {
        await connection.rollback();
        console.error("Bulk Progress Update Error:", error);
        res.status(500).json({ message: 'Failed to update progress.' });
    } finally { connection.release(); }
});

module.exports = router;