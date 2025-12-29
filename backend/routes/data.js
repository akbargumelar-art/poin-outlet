
const express = require('express');
const router = express.Router();
const uploadRouter = express.Router();
const db = require('../db');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');

// Konfigurasi Multer untuk berbagai jenis upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let dir = 'uploads/';
        if (file.fieldname === 'photo' || file.fieldname === 'image') dir += 'images';
        else if (file.fieldname === 'banner') dir += 'banners';
        else dir += 'docs';
        
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ============================================================
// 1. BOOTSTRAP (AMBIL DATA UTAMA)
// ============================================================
router.get('/bootstrap', async (req, res) => {
    try {
        const [users] = await db.execute('SELECT id, role, nama, points, level, kupon_undian, phone, tap, salesforce, no_rs, owner, kabupaten, kecamatan, alamat, jabatan, photo_url FROM users');
        const [transactions] = await db.execute('SELECT * FROM transactions ORDER BY date DESC LIMIT 1000');
        const [loyaltyPrograms] = await db.execute('SELECT * FROM loyalty_programs');
        const [rewards] = await db.execute('SELECT * FROM rewards ORDER BY display_order ASC');
        const [redemptions] = await db.execute('SELECT * FROM redemptions ORDER BY date DESC');
        const [runningPrograms] = await db.execute('SELECT * FROM running_programs');
        const [targets] = await db.execute('SELECT * FROM running_program_targets');
        const [specialNumbers] = await db.execute('SELECT * FROM special_numbers');
        const [waSettings] = await db.execute('SELECT * FROM whatsapp_settings LIMIT 1');

        const programsWithTargets = runningPrograms.map(p => ({
            ...p,
            targets: targets.filter(t => t.program_id === p.id).map(t => ({
                id: t.id,
                programId: t.program_id,
                userId: t.user_id,
                progress: t.progress
            }))
        }));

        res.json({
            success: true,
            users: users.map(u => ({
                id: u.id, role: u.role, points: u.points || 0, level: u.level || 'Bronze', kuponUndian: u.kupon_undian || 0,
                profile: {
                    nama: u.nama || '', phone: u.phone || '', tap: u.tap || '',
                    salesforce: u.salesforce || '', noRs: u.no_rs || '', owner: u.owner || '',
                    kabupaten: u.kabupaten || '', kecamatan: u.kecamatan || '', alamat: u.alamat || '',
                    jabatan: u.jabatan || '', photoUrl: u.photo_url
                }
            })),
            transactions: transactions.map(t => ({
                id: t.id, userId: t.user_id, date: t.date, produk: t.produk, totalPembelian: t.total_pembelian,
                pointsEarned: t.points_earned, harga: t.harga, kuantiti: t.kuantiti
            })),
            loyaltyPrograms: loyaltyPrograms.map(p => ({
                level: p.level, pointsNeeded: p.pointsNeeded, benefit: p.benefit, multiplier: parseFloat(p.multiplier || 1)
            })),
            rewards: rewards.map(r => ({
                id: r.id, name: r.name, points: r.points, imageUrl: r.image_url, stock: r.stock
            })),
            redemptions: redemptions.map(r => ({
                id: r.id, userId: r.user_id, rewardId: r.reward_id, rewardName: r.reward_name, userName: r.user_name,
                pointsSpent: r.points_spent, date: r.date, status: r.status, statusNote: r.status_note,
                documentationPhotoUrl: r.documentation_photo_url, receiverName: r.receiver_name
            })),
            runningPrograms: programsWithTargets,
            specialNumbers: specialNumbers.map(n => ({
                id: n.id, phoneNumber: n.phone_number, price: parseFloat(n.price || 0), isSold: n.is_sold === 1,
                sn: n.sn, lokasi: n.lokasi
            })),
            whatsAppSettings: waSettings[0] || null
        });
    } catch (error) {
        res.status(500).json({ message: 'Gagal bootstrap: ' + error.message });
    }
});

// ============================================================
// 2. AUDIT & SINRONISASI POIN (FIX ERROR 404)
// ============================================================
router.post('/audit/bulk-fix', async (req, res) => {
    try {
        const [users] = await db.execute('SELECT id FROM users WHERE role = "pelanggan"');
        let processed = 0, fixed = 0;

        for (const user of users) {
            const [txRows] = await db.execute('SELECT SUM(points_earned) as total FROM transactions WHERE user_id = ?', [user.id]);
            const [rdRows] = await db.execute('SELECT SUM(points_spent) as total FROM redemptions WHERE user_id = ? AND status != "Ditolak"', [user.id]);
            
            const earned = txRows[0].total || 0;
            const spent = rdRows[0].total || 0;
            const calculatedPoints = Math.max(0, earned - spent);

            await db.execute('UPDATE users SET points = ? WHERE id = ?', [calculatedPoints, user.id]);
            processed++;
        }

        res.json({ success: true, message: `Audit selesai. ${processed} akun diproses.` });
    } catch (error) {
        res.status(500).json({ message: 'Gagal audit massal: ' + error.message });
    }
});

router.post('/audit/fix/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [txRows] = await db.execute('SELECT SUM(points_earned) as total FROM transactions WHERE user_id = ?', [userId]);
        const [rdRows] = await db.execute('SELECT SUM(points_spent) as total FROM redemptions WHERE user_id = ? AND status != "Ditolak"', [userId]);
        
        const earned = txRows[0].total || 0;
        const spent = rdRows[0].total || 0;
        const calculatedPoints = Math.max(0, earned - spent);

        await db.execute('UPDATE users SET points = ? WHERE id = ?', [calculatedPoints, userId]);
        res.json({ success: true, message: `Sinkronisasi poin ${userId} berhasil.` });
    } catch (error) {
        res.status(500).json({ message: 'Gagal audit user: ' + error.message });
    }
});

// ============================================================
// 3. TRANSAKSI & POIN (FIX ERROR 404)
// ============================================================
router.post('/transactions', async (req, res) => {
    const { userId, produk, harga, kuantiti, date, totalPembelian } = req.body;
    try {
        const [uRows] = await db.execute('SELECT level FROM users WHERE id = ?', [userId]);
        if (uRows.length === 0) return res.status(404).json({ message: 'User tidak ditemukan' });

        const [lRows] = await db.execute('SELECT multiplier FROM loyalty_programs WHERE level = ?', [uRows[0].level]);
        const multiplier = lRows[0] ? parseFloat(lRows[0].multiplier) : 1;
        const pointsEarned = Math.floor((totalPembelian / 1000) * multiplier);

        await db.execute(
            'INSERT INTO transactions (user_id, produk, harga, kuantiti, total_pembelian, points_earned, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, produk, harga, kuantiti, totalPembelian, pointsEarned, date]
        );

        await db.execute('UPDATE users SET points = points + ? WHERE id = ?', [pointsEarned, userId]);
        res.json({ success: true, message: 'Transaksi berhasil ditambahkan' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/transactions/bulk', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'File tidak ditemukan' });
    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet);

        for (const row of data) {
            const { id_digipos, produk, harga, kuantiti, tanggal } = row;
            const total = harga * kuantiti;
            
            const [uRows] = await db.execute('SELECT level FROM users WHERE id = ?', [id_digipos]);
            if (uRows.length > 0) {
                const [lRows] = await db.execute('SELECT multiplier FROM loyalty_programs WHERE level = ?', [uRows[0].level]);
                const multiplier = lRows[0] ? parseFloat(lRows[0].multiplier) : 1;
                const points = Math.floor((total / 1000) * multiplier);

                await db.execute(
                    'INSERT INTO transactions (user_id, produk, harga, kuantiti, total_pembelian, points_earned, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [id_digipos, produk, harga, kuantiti, total, points, tanggal || new Date()]
                );
                await db.execute('UPDATE users SET points = points + ? WHERE id = ?', [points, id_digipos]);
            }
        }
        fs.unlinkSync(req.file.path);
        res.json({ success: true, message: 'Upload transaksi selesai' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/users/:id/points', async (req, res) => {
    const { id } = req.params;
    const { points, action } = req.body;
    try {
        const sql = action === 'tambah' ? 'UPDATE users SET points = points + ? WHERE id = ?' : 'UPDATE users SET points = points - ? WHERE id = ?';
        await db.execute(sql, [points, id]);
        res.json({ success: true, message: 'Poin diperbarui' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============================================================
// 4. MANAJEMEN PENUKARAN (REDEMPTIONS)
// ============================================================
router.post('/redemptions/bulk/status', async (req, res) => {
    const { ids, status, statusNote } = req.body;
    try {
        await db.query('UPDATE redemptions SET status = ?, status_note = ?, status_updated_at = NOW() WHERE id IN (?)', [status, statusNote, ids]);
        res.json({ success: true, message: 'Status diperbarui massal' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

uploadRouter.put('/redemptions/:id/status', upload.single('photo'), async (req, res) => {
    const { id } = req.params;
    const { status, note } = req.body;
    const photoUrl = req.file ? `/uploads/images/${req.file.filename}` : null;
    try {
        let sql = 'UPDATE redemptions SET status = ?, status_note = ?, status_updated_at = NOW()';
        let params = [status, note];
        if (photoUrl) { sql += ', documentation_photo_url = ?'; params.push(photoUrl); }
        sql += ' WHERE id = ?'; params.push(id);
        await db.execute(sql, params);
        res.json({ success: true, message: 'Status diperbarui' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============================================================
// 5. PENGATURAN & INTEGRASI
// ============================================================
router.post('/integration/appsheet/sync-all', async (req, res) => {
    res.json({ success: true, message: 'Sinkronisasi AppSheet disimulasikan berhasil.' });
});

router.put('/settings/whatsapp', async (req, res) => {
    const s = req.body;
    try {
        const [rows] = await db.execute('SELECT id FROM whatsapp_settings LIMIT 1');
        if (rows.length > 0) {
            await db.execute('UPDATE whatsapp_settings SET webhook_url=?, sender_number=?, recipient_type=?, recipient_id=?, api_key=?, session_name=?, special_number_recipient=? WHERE id=?', 
            [s.webhookUrl, s.senderNumber, s.recipientType, s.recipientId, s.apiKey, s.sessionName, s.specialNumberRecipient, rows[0].id]);
        } else {
            await db.execute('INSERT INTO whatsapp_settings (webhook_url, sender_number, recipient_type, recipient_id, api_key, session_name, special_number_recipient) VALUES (?,?,?,?,?,?,?)', 
            [s.webhookUrl, s.senderNumber, s.recipientType, s.recipientId, s.apiKey, s.sessionName, s.specialNumberRecipient]);
        }
        res.json({ success: true, message: 'Pengaturan WhatsApp disimpan.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============================================================
// 6. CRUD LAINNYA (PROGRAM, REWARDS, DLL)
// ============================================================
uploadRouter.post('/rewards', upload.single('image'), async (req, res) => {
    const { name, points, stock } = req.body;
    const imageUrl = req.file ? `/uploads/images/${req.file.filename}` : null;
    try {
        await db.execute('INSERT INTO rewards (name, points, stock, image_url) VALUES (?, ?, ?, ?)', [name, points, stock, imageUrl]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/users', async (req, res) => {
    const u = req.body;
    try {
        const hashed = await bcrypt.hash(u.password, 10);
        await db.execute('INSERT INTO users (id, password, role, nama, phone, tap) VALUES (?, ?, ?, ?, ?, ?)', [u.id, hashed, u.role, u.profile.nama, u.profile.phone, u.profile.tap]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/loyalty-programs/:level', async (req, res) => {
    const { level } = req.params;
    const { pointsNeeded, benefit, multiplier } = req.body;
    try {
        await db.execute('UPDATE loyalty_programs SET pointsNeeded=?, benefit=?, multiplier=? WHERE level=?', [pointsNeeded, benefit, multiplier, level]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = { router, uploadRouter };
