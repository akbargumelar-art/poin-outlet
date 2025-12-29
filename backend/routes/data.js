
const express = require('express');
const router = express.Router();
const uploadRouter = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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

// Helper WA Message
const sendWAMessage = async (to, message) => {
    try {
        const [settingsRows] = await db.execute('SELECT * FROM whatsapp_settings LIMIT 1');
        if (settingsRows.length === 0) return false;
        const s = settingsRows[0];
        if (!s.webhook_url || !s.api_key) return false;
        let cleanTo = to;
        if (!cleanTo.includes('@')) cleanTo = cleanTo + '@c.us';
        const url = `${s.webhook_url.replace(/\/$/, '')}/api/sendText`;
        await axios.post(url, { chatId: cleanTo, text: message, session: s.session_name || 'default' }, { headers: { 'X-Api-Key': s.api_key } });
        return true;
    } catch (error) {
        console.error('WA Notification Error:', error.message);
        return false;
    }
};

// ==========================================
// APPSHEET AUTO-SYNC ENDPOINT (REFINED)
// ==========================================
router.post('/integration/redemption/update', async (req, res) => {
    const data = req.body;
    console.log('--- Sinkronisasi dari AppSheet Masuk ---', data);

    /**
     * MAPPING DATA BERDASARKAN SCREENSHOT SPREADSHEET USER:
     */
    const redeemId = data['ID Redeem']; // Kunci utama untuk sinkronisasi
    const status = data['Status'] || 'Selesai'; // Jika masuk dari appsheet, asumsikan selesai
    const photo = data['Photo Dokumentasi'] || ''; // Nama file/link foto dari appsheet
    const surveyor = data['Nama Surveyor'] || '';
    const receiverName = data['Nama Penerima'] || '';
    const receiverRole = data['Penerima Hadiah'] || '';
    const coordinates = data['Long - Lat'] || ''; // Mengambil data lokasi GPS
    const note = data['Catatan'] || 'Diselesaikan via AppSheet';

    if (!redeemId) {
        return res.status(400).json({ success: false, message: 'ID Redeem (Kolom J) wajib ada untuk sinkronisasi.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Validasi keberadaan data di DB Web
        const [redemptions] = await connection.execute('SELECT * FROM redemptions WHERE id = ?', [redeemId]);
        if (redemptions.length === 0) {
            throw new Error(`ID Redeem ${redeemId} tidak ditemukan di database Web. Pastikan Anda sudah import data ke AppSheet menggunakan template.`);
        }
        const redemption = redemptions[0];

        // 2. Update status dan data dokumentasi
        const updateSql = `
            UPDATE redemptions SET 
                status = ?, 
                status_note = ?, 
                documentation_photo_url = ?, 
                surveyor_name = ?, 
                receiver_name = ?, 
                receiver_role = ?, 
                location_coordinates = ?, 
                status_updated_at = NOW() 
            WHERE id = ?
        `;
        
        // Catatan: Photo dokumentasi biasanya berupa link Google Drive atau path di AppSheet.
        // Anda mungkin perlu menyesuaikan prefix URL-nya jika ingin ditampilkan langsung di web.
        await connection.execute(updateSql, [
            status,
            note,
            photo,
            surveyor,
            receiverName,
            receiverRole,
            coordinates,
            redeemId
        ]);

        // 3. Jika status Ditolak di AppSheet, kembalikan poin
        if (status === 'Ditolak' && redemption.status !== 'Ditolak') {
            await connection.execute('UPDATE users SET points = points + ? WHERE id = ?', [redemption.points_spent, redemption.user_id]);
            await connection.execute('UPDATE rewards SET stock = stock + 1 WHERE id = ?', [redemption.reward_id]);
        }

        await connection.commit();
        console.log(`Sync Sukses: ID ${redeemId} diperbarui.`);
        res.json({ success: true, message: `Berhasil sinkronisasi ID ${redeemId}` });

    } catch (error) {
        await connection.rollback();
        console.error('Sync Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
});

// --- Endpoint Lainnya (Bootstrap, dll) tetap sama ---
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
        const specialNumbers = await safeQuery('SELECT * FROM special_numbers');
        const waSettings = await safeQuery('SELECT * FROM whatsapp_settings LIMIT 1');
        const locations = await safeQuery('SELECT DISTINCT kabupaten, kecamatan FROM digipos_data'); 
        
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
            whatsAppSettings: waSettings.length > 0 ? waSettings[0] : null,
            locations
        });
    } catch (error) { res.status(500).json({ message: 'Bootstrap failed' }); }
});

module.exports = { router, uploadRouter };
