
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

// Konfigurasi Multer
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
// 1. BOOTSTRAP & CORE DATA
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
                id: t.id, programId: t.program_id, userId: t.user_id, progress: t.progress
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
        res.status(500).json({ message: 'Gagal memuat data: ' + error.message });
    }
});

// ============================================================
// 2. MANAJEMEN PENUKARAN (PARTNER & ADMIN)
// ============================================================

// Partner: Mengajukan penukaran
router.post('/redemptions', async (req, res) => {
    const { rewardId, userId } = req.body;
    try {
        const [user] = await db.execute('SELECT points, nama, tap FROM users WHERE id = ?', [userId]);
        const [reward] = await db.execute('SELECT name, points, stock FROM rewards WHERE id = ?', [rewardId]);

        if (!user[0] || !reward[0]) return res.status(404).json({ message: 'User atau Hadiah tidak ditemukan' });
        if (user[0].points < reward[0].points) return res.status(400).json({ message: 'Poin tidak cukup' });
        if (reward[0].stock <= 0) return res.status(400).json({ message: 'Stok hadiah habis' });

        await db.execute(
            'INSERT INTO redemptions (user_id, reward_id, points_spent, user_name, reward_name, status) VALUES (?, ?, ?, ?, ?, "Diajukan")',
            [userId, rewardId, reward[0].points, user[0].nama, reward[0].name]
        );

        await db.execute('UPDATE users SET points = points - ? WHERE id = ?', [reward[0].points, userId]);
        await db.execute('UPDATE rewards SET stock = stock - 1 WHERE id = ?', [rewardId]);

        res.json({ success: true, message: 'Penukaran diajukan' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin: Update Status Massal
router.post('/redemptions/bulk/status', async (req, res) => {
    const { ids, status, statusNote } = req.body;
    try {
        await db.query('UPDATE redemptions SET status = ?, status_note = ?, status_updated_at = NOW() WHERE id IN (?)', [status, statusNote, ids]);
        res.json({ success: true, message: 'Status massal diperbarui' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============================================================
// 3. AUDIT POIN & MANAJEMEN USER
// ============================================================

// Audit detail untuk modal
router.get('/users/:id/audit', async (req, res) => {
    const { id } = req.params;
    try {
        const [tx] = await db.execute('SELECT SUM(points_earned) as earned FROM transactions WHERE user_id = ?', [id]);
        const [rd] = await db.execute('SELECT SUM(points_spent) as spent FROM redemptions WHERE user_id = ? AND status != "Ditolak"', [id]);
        const [user] = await db.execute('SELECT points FROM users WHERE id = ?', [id]);

        const earned = tx[0].earned || 0;
        const spent = rd[0].spent || 0;
        const calculated = earned - spent;
        const actual = user[0].points || 0;

        res.json({ earned, spent, calculated, actual, discrepancy: actual - calculated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Fix audit massal
router.post('/audit/bulk-fix', async (req, res) => {
    try {
        const [users] = await db.execute('SELECT id FROM users WHERE role = "pelanggan"');
        for (const u of users) {
            const [tx] = await db.execute('SELECT SUM(points_earned) as earned FROM transactions WHERE user_id = ?', [u.id]);
            const [rd] = await db.execute('SELECT SUM(points_spent) as spent FROM redemptions WHERE user_id = ? AND status != "Ditolak"', [u.id]);
            const calculated = (tx[0].earned || 0) - (rd[0].spent || 0);
            await db.execute('UPDATE users SET points = ? WHERE id = ?', [Math.max(0, calculated), u.id]);
        }
        res.json({ success: true, message: 'Audit massal selesai.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Reset Password
router.post('/users/:id/reset-password', async (req, res) => {
    try {
        const hashed = await bcrypt.hash('mitra123', 10);
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, req.params.id]);
        res.json({ success: true, message: 'Password direset ke default: mitra123' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Set Level User
router.put('/users/:id/level', async (req, res) => {
    try {
        await db.execute('UPDATE users SET level = ? WHERE id = ?', [req.body.level, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============================================================
// 4. MANAJEMEN NOMOR SPESIAL
// ============================================================
router.post('/special-numbers', async (req, res) => {
    const { phoneNumber, price, sn, lokasi } = req.body;
    try {
        await db.execute('INSERT INTO special_numbers (phone_number, price, sn, lokasi) VALUES (?, ?, ?, ?)', [phoneNumber, price, sn, lokasi]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete('/special-numbers/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM special_numbers WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

uploadRouter.post('/special-numbers/banner', upload.single('banner'), async (req, res) => {
    // Simulasikan penyimpanan setting banner (misal di DB atau config)
    res.json({ success: true, message: 'Banner diperbarui' });
});

module.exports = { router, uploadRouter };
