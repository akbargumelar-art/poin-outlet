
const express = require('express');
const router = express.Router();
const uploadRouter = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const axios = require('axios');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});
const upload = multer({ storage: storage });

const getBaseUrl = (req) => `${req.protocol}://${req.get('host')}`;

const sendWAMessage = async (to, message) => {
    try {
        const [settingsRows] = await db.execute('SELECT * FROM whatsapp_settings LIMIT 1');
        if (settingsRows.length === 0) return false;
        
        const s = settingsRows[0];
        if (!s.webhook_url || !s.api_key) return false;

        // Ensure proper ID for WAHA (Group usually ends with @g.us, Personal with @c.us)
        let cleanTo = to;
        if (!cleanTo.includes('@')) {
            cleanTo = cleanTo + '@c.us';
        }

        const url = `${s.webhook_url.replace(/\/$/, '')}/api/sendText`;
        await axios.post(url, {
            chatId: cleanTo,
            text: message,
            session: s.session_name || 'default'
        }, {
            headers: { 'X-Api-Key': s.api_key }
        });
        return true;
    } catch (error) {
        console.error('WA Notification Error:', error.message);
        return false;
    }
};

// ==========================================
// DATA ROUTER (JSON APIs)
// ==========================================

router.post('/integration/redemption/update', async (req, res) => {
    const data = req.body;
    const redeemId = data.id;
    if (!redeemId) return res.status(400).json({ message: 'Missing Redemption ID' });
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [redemptions] = await connection.execute('SELECT * FROM redemptions WHERE id = ?', [redeemId]);
        if (redemptions.length === 0) throw new Error(`Redemption ID ${redeemId} not found.`);
        const redemption = redemptions[0];
        const updateSql = `UPDATE redemptions SET status = ?, status_note = ?, documentation_photo_url = ?, receiver_name = ?, receiver_role = ?, surveyor_name = ?, location_coordinates = ?, status_updated_at = NOW() WHERE id = ?`;
        await connection.execute(updateSql, [data.status || redemption.status, data.note || redemption.status_note, data.photo_url || redemption.documentation_photo_url, data.receiver_name || redemption.receiver_name, data.receiver_role || redemption.receiver_role, data.surveyor_name || redemption.surveyor_name, data.location || redemption.location_coordinates, redeemId]);
        if (data.status === 'Ditolak' && redemption.status !== 'Ditolak') {
            await connection.execute('UPDATE users SET points = points + ? WHERE id = ?', [redemption.points_spent, redemption.user_id]);
            await connection.execute('UPDATE rewards SET stock = stock + 1 WHERE id = ?', [redemption.reward_id]);
        }
        await connection.commit();
        res.json({ success: true, message: 'Sync successful' });
    } catch (error) { await connection.rollback(); res.status(500).json({ message: error.message }); } finally { connection.release(); }
});

router.put('/special-numbers/:id/status', async (req, res) => {
    const { id } = req.params;
    const { isSold } = req.body;
    try {
        const [rows] = await db.execute('SELECT * FROM special_numbers WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Nomor tidak ditemukan' });
        const number = rows[0];
        const wasSold = Boolean(number.is_sold);
        const nowSold = Boolean(isSold);
        await db.execute('UPDATE special_numbers SET is_sold = ? WHERE id = ?', [nowSold ? 1 : 0, id]);
        if (!wasSold && nowSold) {
            const [settingsRows] = await db.execute('SELECT * FROM whatsapp_settings LIMIT 1');
            if (settingsRows.length > 0) {
                const s = settingsRows[0];
                const recipientId = s.special_number_status_recipient_id;
                if (recipientId) {
                    const message = `📢 *NOTIFIKASI NOMOR TERJUAL*\n\n` +
                                    `📱 *Nomor:* ${number.phone_number}\n` +
                                    `📍 *Lokasi:* ${number.lokasi || '-'}\n` +
                                    `🏷️ *Harga:* Rp ${Number(number.price).toLocaleString('id-ID')}\n` +
                                    `🔢 *SN:* ${number.sn || '-'}\n\n` +
                                    `✅ Status telah diupdate ke *TERJUAL* oleh sistem.`;
                    await sendWAMessage(recipientId, message);
                }
            }
        }
        res.json({ message: 'Status updated' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/bootstrap', async (req, res) => {
    try {
        const safeQuery = async (q) => { try { const [r] = await db.execute(q); return r; } catch (e) { return []; } };
        const users = await safeQuery('SELECT * FROM users');
        const transactions = await safeQuery('SELECT * FROM transactions ORDER BY date DESC');
        const loyaltyPrograms = await safeQuery('SELECT * FROM loyalty_programs');
        const rewards = await safeQuery('SELECT * FROM rewards ORDER BY display_order ASC, id DESC');
        const runningPrograms = await safeQuery('SELECT * FROM running_programs');
        const runningProgramTargets = await safeQuery('SELECT * FROM running_program_targets');
        const rafflePrograms = await safeQuery('SELECT * FROM raffle_programs');
        const raffleWinners = await safeQuery('SELECT * FROM raffle_winners');
        const redemptions = await safeQuery('SELECT * FROM redemptions ORDER BY date DESC');
        const couponRedemptions = await safeQuery('SELECT * FROM coupon_redemptions');
        const specialNumbers = await safeQuery('SELECT * FROM special_numbers');
        const waSettings = await safeQuery('SELECT * FROM whatsapp_settings LIMIT 1');
        const locations = await safeQuery('SELECT DISTINCT kabupaten, kecamatan FROM digipos_data'); 
        const configPath = path.join(__dirname, '../config_store.json');
        let specialNumberBannerUrl = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath)).specialNumberBannerUrl : null;
        res.json({
            users: users.map(u => ({ id: u.id, role: u.role, points: u.points, level: u.level, kuponUndian: u.kupon_undian, profile: { nama: u.nama, email: u.email, phone: u.phone, owner: u.owner, kabupaten: u.kabupaten, kecamatan: u.kecamatan, salesforce: u.salesforce, noRs: u.no_rs, alamat: u.alamat, tap: u.tap, jabatan: u.jabatan, photoUrl: u.photo_url } })),
            transactions: transactions.map(t => ({ id: t.id, userId: t.user_id, date: t.date, produk: t.produk, harga: Number(t.harga), kuantiti: Number(t.kuantiti), totalPembelian: Number(t.total_pembelian), pointsEarned: Number(t.points_earned) })),
            loyaltyPrograms,
            runningPrograms: runningPrograms.map(p => ({ ...p, prizeCategory: p.prize_category, prizeDescription: p.prize_description, startDate: p.start_date, endDate: p.end_date, imageUrl: p.image_url, targets: runningProgramTargets.filter(t => t.program_id === p.id).map(t => ({ userId: t.user_id, progress: t.progress })) })),
            rewards: rewards.map(r => ({ id: r.id, name: r.name, points: r.points, imageUrl: r.image_url, stock: r.stock })),
            rafflePrograms,
            raffleWinners: raffleWinners.map(w => ({...w, photoUrl: w.photo_url})),
            redemptions: redemptions.map(r => ({ id: r.id, userId: r.user_id, userName: r.user_name, rewardId: r.reward_id, rewardName: r.reward_name, pointsSpent: r.points_spent, date: r.date, status: r.status, statusNote: r.status_note, statusUpdatedAt: r.status_updated_at, documentationPhotoUrl: r.documentation_photo_url, receiverName: r.receiver_name, receiverRole: r.receiver_role, surveyorName: r.surveyor_name, locationCoordinates: r.location_coordinates })),
            specialNumbers: specialNumbers.map(n => ({ id: n.id, phoneNumber: n.phone_number, price: Number(n.price), isSold: Boolean(n.is_sold), sn: n.sn, lokasi: n.lokasi })),
            whatsAppSettings: waSettings.length > 0 ? { 
                webhookUrl: waSettings[0].webhook_url, 
                senderNumber: waSettings[0].sender_number, 
                recipientType: waSettings[0].recipient_type, 
                recipientId: waSettings[0].recipient_id, 
                apiKey: waSettings[0].api_key, 
                sessionName: waSettings[0].session_name, 
                specialNumberRecipient: waSettings[0].special_number_recipient,
                specialNumberStatusRecipientType: waSettings[0].special_number_status_recipient_type,
                specialNumberStatusRecipientId: waSettings[0].special_number_status_recipient_id
            } : null,
            specialNumberBannerUrl,
            locations
        });
    } catch (error) { res.status(500).json({ message: 'Failed to fetch bootstrap data' }); }
});

router.put('/settings/whatsapp', async (req, res) => {
    try {
        const s = req.body;
        await db.execute('DELETE FROM whatsapp_settings');
        await db.execute('INSERT INTO whatsapp_settings (webhook_url, sender_number, recipient_type, recipient_id, api_key, session_name, special_number_recipient, special_number_status_recipient_type, special_number_status_recipient_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
            [s.webhookUrl, s.senderNumber, s.recipientType, s.recipientId, s.apiKey, s.sessionName, s.specialNumberRecipient, s.specialNumberStatusRecipientType, s.specialNumberStatusRecipientId]);
        res.json({ message: 'Settings saved' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/users', async (req, res) => {
    const { id, password, role, profile } = req.body;
    try {
        const hashed = await bcrypt.hash(password, 10);
        await db.execute(`INSERT INTO users (id, password, role, nama, email, phone, tap, points, level, jabatan, salesforce, no_rs, owner, kabupaten, kecamatan, alamat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, hashed, role, profile.nama, profile.email, profile.phone, profile.tap, 0, 'Bronze', profile.jabatan, profile.salesforce, profile.noRs, profile.owner, profile.kabupaten, profile.kecamatan, profile.alamat]);
        res.json({ message: 'User created' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = { router, uploadRouter };
