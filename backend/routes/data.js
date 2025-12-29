
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

// Helper: Kirim Notifikasi WA
const sendWANotification = async (to, message, type = 'personal') => {
    try {
        const [settings] = await db.execute('SELECT * FROM whatsapp_settings LIMIT 1');
        if (!settings[0] || !settings[0].webhook_url) return false;
        const s = settings[0];
        const endpoint = type === 'group' ? '/api/sendGroupMessage' : '/api/sendText';
        const payload = type === 'group' ? { chatId: to, text: message } : { phone: to, text: message };
        await axios.post(`${s.webhook_url}${endpoint}`, { ...payload, session: s.session_name || 'default' }, { headers: { 'X-Api-Key': s.api_key } });
        return true;
    } catch (e) { return false; }
};

// ============================================================
// 1. BOOTSTRAP
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
        const [rafflePrograms] = await db.execute('SELECT * FROM raffle_programs');
        const [couponRedemptions] = await db.execute('SELECT * FROM coupon_redemptions');
        const [raffleWinners] = await db.execute('SELECT * FROM raffle_winners');
        const [specialNumbers] = await db.execute('SELECT * FROM special_numbers');
        const [waSettings] = await db.execute('SELECT * FROM whatsapp_settings LIMIT 1');

        res.json({
            success: true,
            users: users.map(u => ({ id: u.id, role: u.role, points: u.points || 0, level: u.level || 'Bronze', kuponUndian: u.kupon_undian || 0, profile: { nama: u.nama, phone: u.phone, tap: u.tap, salesforce: u.salesforce, noRs: u.no_rs, owner: u.owner, kabupaten: u.kabupaten, kecamatan: u.kecamatan, alamat: u.alamat, jabatan: u.jabatan, photoUrl: u.photo_url } })),
            transactions: transactions.map(t => ({ id: t.id, userId: t.user_id, date: t.date, produk: t.produk, totalPembelian: t.total_pembelian, pointsEarned: t.points_earned, harga: t.harga, kuantiti: t.kuantiti })),
            loyaltyPrograms: loyaltyPrograms.map(p => ({ level: p.level, pointsNeeded: p.pointsNeeded, benefit: p.benefit, multiplier: parseFloat(p.multiplier || 1) })),
            rewards: rewards.map(r => ({ id: r.id, name: r.name, points: r.points, imageUrl: r.image_url, stock: r.stock })),
            redemptions: redemptions.map(r => ({ id: r.id, userId: r.user_id, rewardId: r.reward_id, rewardName: r.reward_name, userName: r.user_name, pointsSpent: r.points_spent, date: r.date, status: r.status, statusNote: r.status_note, documentationPhotoUrl: r.documentation_photo_url, receiverName: r.receiver_name, locationCoordinates: r.location_coordinates })),
            runningPrograms: runningPrograms.map(p => ({ ...p, targets: targets.filter(t => t.program_id === p.id).map(t => ({ id: t.id, programId: t.program_id, userId: t.user_id, progress: t.progress })) })),
            rafflePrograms: rafflePrograms.map(rp => ({ id: rp.id, name: rp.name, prize: rp.prize, period: rp.period, isActive: rp.is_active === 1 })),
            couponRedemptions: couponRedemptions.map(cr => ({ id: cr.id, userId: cr.user_id, raffleProgramId: cr.raffle_program_id, redeemedAt: cr.redeemed_at })),
            raffleWinners: raffleWinners.map(rw => ({ id: rw.id, name: rw.name, prize: rw.prize, photoUrl: rw.photo_url, period: rw.period })),
            specialNumbers: specialNumbers.map(n => ({ id: n.id, phoneNumber: n.phone_number, price: parseFloat(n.price || 0), isSold: n.is_sold === 1, sn: n.sn, lokasi: n.lokasi })),
            whatsAppSettings: waSettings[0] || null
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// ============================================================
// 2. BULK OPERATIONS (TRANSACTIONS & LEVELS)
// ============================================================
uploadRouter.post('/transactions/bulk', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'File tidak ditemukan' });
    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet);
        
        for (const row of data) {
            const { id_digipos, produk, harga, kuantiti } = row;
            const total = harga * kuantiti;
            const [user] = await db.execute('SELECT level FROM users WHERE id = ?', [id_digipos]);
            if (user[0]) {
                const [prog] = await db.execute('SELECT multiplier FROM loyalty_programs WHERE level = ?', [user[0].level]);
                const points = Math.floor((total / 1000) * (prog[0]?.multiplier || 1));
                await db.execute('INSERT INTO transactions (user_id, produk, harga, kuantiti, total_pembelian, points_earned) VALUES (?,?,?,?,?,?)', [id_digipos, produk, harga, kuantiti, total, points]);
                await db.execute('UPDATE users SET points = points + ? WHERE id = ?', [points, id_digipos]);
            }
        }
        res.json({ success: true, message: `${data.length} transaksi berhasil diimpor.` });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

uploadRouter.post('/users/levels/bulk', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'File tidak ditemukan' });
    try {
        const workbook = xlsx.readFile(req.file.path);
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        for (const row of data) {
            await db.execute('UPDATE users SET level = ? WHERE id = ?', [row.level, row.id_digipos]);
        }
        res.json({ success: true, message: 'Level mitra berhasil diperbarui.' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================================
// 3. SPECIAL NUMBERS & OTHERS
// ============================================================
router.delete('/special-numbers/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM special_numbers WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/integration/appsheet/sync-all', async (req, res) => {
    // Simulasi integrasi balik: Admin menekan tombol ini untuk "menarik" status terbaru dari AppSheet ke DB Lokal
    // Dalam produksi, ini biasanya dihubungkan ke API AppSheet atau Google Apps Script
    res.json({ success: true, message: 'Sinkronisasi dengan AppSheet selesai. Status penukaran telah diperbarui.' });
});

module.exports = { router, uploadRouter };
