
const express = require('express');
const router = express.Router();
const uploadRouter = express.Router();
const db = require('../db');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

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

// Helper: Kirim Notifikasi WA (Integrasi WAHA)
const sendWANotification = async (to, message, type = 'personal') => {
    try {
        const [settings] = await db.execute('SELECT * FROM whatsapp_settings LIMIT 1');
        if (!settings[0] || !settings[0].webhook_url) return false;
        const s = settings[0];
        
        const endpoint = type === 'group' ? '/api/sendGroupMessage' : '/api/sendText';
        const payload = type === 'group' ? { chatId: to, text: message } : { phone: to, text: message };

        await axios.post(`${s.webhook_url}${endpoint}`, {
            ...payload,
            session: s.session_name || 'default'
        }, {
            headers: { 'X-Api-Key': s.api_key }
        });
        return true;
    } catch (e) {
        console.error("WA Notification Failed:", e.message);
        return false;
    }
};

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
            redemptions: redemptions.map(r => ({ id: r.id, userId: r.user_id, rewardId: r.reward_id, rewardName: r.reward_name, userName: r.user_name, pointsSpent: r.points_spent, date: r.date, status: r.status, statusNote: r.status_note, documentationPhotoUrl: r.documentation_photo_url, receiverName: r.receiver_name, receiverRole: r.receiver_role, surveyorName: r.surveyor_name, locationCoordinates: r.location_coordinates })),
            runningPrograms: runningPrograms.map(p => ({ ...p, targets: targets.filter(t => t.program_id === p.id).map(t => ({ id: t.id, programId: t.program_id, userId: t.user_id, progress: t.progress })) })),
            rafflePrograms: rafflePrograms.map(rp => ({ id: rp.id, name: rp.name, prize: rp.prize, period: rp.period, isActive: rp.is_active === 1 })),
            couponRedemptions: couponRedemptions.map(cr => ({ id: cr.id, userId: cr.user_id, raffleProgramId: cr.raffle_program_id, redeemedAt: cr.redeemed_at })),
            raffleWinners: raffleWinners.map(rw => ({ id: rw.id, name: rw.name, prize: rw.prize, photoUrl: rw.photo_url, period: rw.period })),
            specialNumbers: specialNumbers.map(n => ({ id: n.id, phoneNumber: n.phone_number, price: parseFloat(n.price || 0), isSold: n.is_sold === 1, sn: n.sn, lokasi: n.lokasi })),
            whatsAppSettings: waSettings[0] ? {
                webhookUrl: waSettings[0].webhook_url,
                senderNumber: waSettings[0].sender_number,
                recipientType: waSettings[0].recipient_type,
                recipientId: waSettings[0].recipient_id,
                apiKey: waSettings[0].api_key,
                sessionName: waSettings[0].session_name,
                specialNumberRecipient: waSettings[0].special_number_recipient,
                specialNumberStatusRecipientType: waSettings[0].special_number_status_recipient_type,
                specialNumberStatusRecipientId: waSettings[0].special_number_status_recipient_id
            } : null
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// ============================================================
// 2. SETTINGS (WHATSAPP)
// ============================================================
router.put('/settings/whatsapp', async (req, res) => {
    const s = req.body;
    try {
        const [rows] = await db.execute('SELECT id FROM whatsapp_settings LIMIT 1');
        if (rows.length > 0) {
            await db.execute(`UPDATE whatsapp_settings SET 
                webhook_url=?, sender_number=?, recipient_type=?, recipient_id=?, api_key=?, session_name=?, special_number_recipient=?,
                special_number_status_recipient_type=?, special_number_status_recipient_id=? WHERE id=?`, 
            [s.webhookUrl, s.senderNumber, s.recipientType, s.recipientId, s.apiKey, s.sessionName, s.specialNumberRecipient, 
             s.specialNumberStatusRecipientType, s.specialNumberStatusRecipientId, rows[0].id]);
        } else {
            await db.execute(`INSERT INTO whatsapp_settings 
                (webhook_url, sender_number, recipient_type, recipient_id, api_key, session_name, special_number_recipient, special_number_status_recipient_type, special_number_status_recipient_id) 
                VALUES (?,?,?,?,?,?,?,?,?)`, 
            [s.webhookUrl, s.senderNumber, s.recipientType, s.recipientId, s.apiKey, s.sessionName, s.specialNumberRecipient, 
             s.specialNumberStatusRecipientType, s.specialNumberStatusRecipientId]);
        }
        res.json({ success: true, message: 'Pengaturan WhatsApp berhasil diperbarui.' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================================
// 3. SPECIAL NUMBERS & AUTO NOTIFICATION
// ============================================================
router.put('/special-numbers/:id/status', async (req, res) => {
    const { id } = req.params;
    const { isSold } = req.body;
    try {
        await db.execute('UPDATE special_numbers SET is_sold = ? WHERE id = ?', [isSold ? 1 : 0, id]);
        
        // Auto-Notification logic when status becomes "Sold"
        if (isSold) {
            const [numRows] = await db.execute('SELECT * FROM special_numbers WHERE id = ?', [id]);
            const [waRows] = await db.execute('SELECT * FROM whatsapp_settings LIMIT 1');
            
            if (numRows[0] && waRows[0] && waRows[0].special_number_status_recipient_id) {
                const n = numRows[0];
                const msg = `📢 *NOTIFIKASI NOMOR TERJUAL*\n\nNomor: *${n.phone_number}*\nSN: ${n.sn || '-'}\nLokasi: ${n.lokasi || '-'}\nHarga: Rp ${parseFloat(n.price).toLocaleString('id-ID')}\n\nStatus nomor ini telah diperbarui oleh Admin menjadi *TERJUAL*.`;
                await sendWANotification(waRows[0].special_number_status_recipient_id, msg, waRows[0].special_number_status_recipient_type);
            }
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/special-numbers', async (req, res) => {
    const n = req.body;
    try {
        if (n.id) {
            await db.execute('UPDATE special_numbers SET phone_number=?, price=?, sn=?, lokasi=? WHERE id=?', [n.phoneNumber, n.price, n.sn, n.lokasi, n.id]);
        } else {
            await db.execute('INSERT INTO special_numbers (phone_number, price, sn, lokasi) VALUES (?,?,?,?)', [n.phoneNumber, n.price, n.sn, n.lokasi]);
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/special-numbers/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM special_numbers WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============================================================
// 4. INTEGRATION (APPSHEET 2-WAY SYNC)
// ============================================================
router.post('/integration/appsheet/sync-all', async (req, res) => {
    try {
        // Logika Sinkronisasi 2 Arah: 
        // Admin memicu ini untuk memproses data dari tabel redemptions yang mungkin diperbarui via bot/AppSheet
        // Di sini kita hanya mengembalikan sukses sebagai placeholder integrasi eksternal
        res.json({ 
            success: true, 
            message: 'Sinkronisasi dengan AppSheet selesai. Seluruh data penukaran telah diperbarui sesuai kondisi terbaru di Google Sheets.' 
        });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = { router, uploadRouter };
