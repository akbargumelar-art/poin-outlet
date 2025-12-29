
const express = require('express');
const router = express.Router();
const uploadRouter = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const axios = require('axios'); // For WA notifications

// --- CONFIGURATION ---
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

// --- HELPER: SEND WHATSAPP MESSAGE VIA WAHA ---
const sendWAMessage = async (to, message) => {
    try {
        const [settingsRows] = await db.execute('SELECT * FROM whatsapp_settings LIMIT 1');
        if (settingsRows.length === 0) return false;
        
        const s = settingsRows[0];
        if (!s.webhook_url || !s.api_key) return false;

        const cleanTo = to.includes('@') ? to : to + '@c.us';
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
// UPLOAD ROUTER (Multipart/Form-Data)
// ==========================================

// 0. Update User Profile & Photo
uploadRouter.put('/users/:id/profile', upload.single('photo'), async (req, res) => {
    const { id } = req.params;
    const { nama, email, phone, owner, kabupaten, kecamatan, salesforce, noRs, alamat, tap, jabatan } = req.body;
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    try {
        let query = `
            UPDATE users SET 
            nama=?, email=?, phone=?, owner=?, kabupaten=?, kecamatan=?, 
            salesforce=?, no_rs=?, alamat=?, tap=?, jabatan=?
        `;
        const params = [nama, email, phone, owner, kabupaten, kecamatan, salesforce, noRs, alamat, tap, jabatan];

        if (photoUrl) {
            query += `, photo_url=?`;
            params.push(photoUrl);
        }

        query += ` WHERE id=?`;
        params.push(id);

        await db.execute(query, params);
        res.json({ message: 'Profil berhasil diperbarui', photoUrl: photoUrl });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 1. Upload & Process Program Progress (Excel)
uploadRouter.post('/programs/:id/progress', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    try {
        const workbook = xlsx.readFile(req.file.path);
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        const connection = await db.getConnection();
        await connection.beginTransaction();
        for (const row of data) {
            const userId = row['id_digipos'];
            const progress = row['progress'];
            if (userId && progress !== undefined) {
                const [existing] = await connection.execute('SELECT id FROM running_program_targets WHERE program_id = ? AND user_id = ?', [req.params.id, userId]);
                if (existing.length > 0) {
                    await connection.execute('UPDATE running_program_targets SET progress = ? WHERE id = ?', [progress, existing[0].id]);
                } else {
                    await connection.execute('INSERT INTO running_program_targets (program_id, user_id, progress) VALUES (?, ?, ?)', [req.params.id, userId, progress]);
                }
            }
        }
        await connection.commit();
        connection.release();
        fs.unlinkSync(req.file.path);
        res.json({ message: 'Progress updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to process file' });
    }
});

// 2. Add/Update Programs
uploadRouter.post('/programs', upload.single('image'), async (req, res) => {
    const { name, mechanism, prizeCategory, prizeDescription, startDate, endDate } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
    try {
        await db.execute('INSERT INTO running_programs (name, mechanism, prize_category, prize_description, start_date, end_date, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)', [name, mechanism, prizeCategory, prizeDescription, startDate, endDate, imageUrl]);
        res.json({ message: 'Program created' });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

uploadRouter.put('/programs/:id', upload.single('image'), async (req, res) => {
    const { name, mechanism, prizeCategory, prizeDescription, startDate, endDate } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    try {
        let query = 'UPDATE running_programs SET name=?, mechanism=?, prize_category=?, prize_description=?, start_date=?, end_date=?';
        const params = [name, mechanism, prizeCategory, prizeDescription, startDate, endDate];
        if (imageUrl) { query += ', image_url=?'; params.push(imageUrl); }
        query += ' WHERE id=?'; params.push(req.params.id);
        await db.execute(query, params);
        res.json({ message: 'Program updated' });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// 3. Add/Update Rewards
uploadRouter.post('/rewards', upload.single('image'), async (req, res) => {
    const { name, points, stock } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
    try {
        await db.execute('INSERT INTO rewards (name, points, image_url, stock) VALUES (?, ?, ?, ?)', [name, points, imageUrl, stock]);
        res.json({ message: 'Reward added' });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

uploadRouter.put('/rewards/:id', upload.single('image'), async (req, res) => {
    const { name, points, stock } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    try {
        let query = 'UPDATE rewards SET name=?, points=?, stock=?';
        const params = [name, points, stock];
        if (imageUrl) { query += ', image_url=?'; params.push(imageUrl); }
        query += ' WHERE id=?'; params.push(req.params.id);
        await db.execute(query, params);
        res.json({ message: 'Reward updated' });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// 4. Redemption Status
uploadRouter.put('/redemptions/:id/status', upload.single('photo'), async (req, res) => {
    const { status, note } = req.body;
    const photoUrl = req.file ? `${getBaseUrl(req)}/uploads/${req.file.filename}` : null;
    try {
        let query = 'UPDATE redemptions SET status = ?, status_note = ?, status_updated_at = NOW()';
        const params = [status, note];
        if (photoUrl) { query += ', documentation_photo_url = ?'; params.push(photoUrl); }
        query += ' WHERE id = ?'; params.push(req.params.id);
        await db.execute(query, params);
        if (status === 'Ditolak') {
            await db.execute('UPDATE rewards r JOIN redemptions rd ON r.id = rd.reward_id SET r.stock = r.stock + 1 WHERE rd.id = ?', [req.params.id]);
        }
        res.json({ message: 'Status updated' });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// ==========================================
// DATA ROUTER (JSON APIs)
// ==========================================

// --- NEW: APPSHEET INTEGRATION WEBHOOK (NO CHANGE NEEDED BY USER) ---
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

        const updateSql = `
            UPDATE redemptions SET 
                status = ?, status_note = ?, documentation_photo_url = ?, 
                receiver_name = ?, receiver_role = ?, surveyor_name = ?, 
                location_coordinates = ?, status_updated_at = NOW() 
            WHERE id = ?
        `;
        await connection.execute(updateSql, [
            data.status || redemption.status,
            data.note || redemption.status_note,
            data.photo_url || redemption.documentation_photo_url,
            data.receiver_name || redemption.receiver_name,
            data.receiver_role || redemption.receiver_role,
            data.surveyor_name || redemption.surveyor_name,
            data.location || redemption.location_coordinates,
            redeemId
        ]);

        if (data.status === 'Ditolak' && redemption.status !== 'Ditolak') {
            await connection.execute('UPDATE users SET points = points + ? WHERE id = ?', [redemption.points_spent, redemption.user_id]);
            await connection.execute('UPDATE rewards SET stock = stock + 1 WHERE id = ?', [redemption.reward_id]);
        }

        await connection.commit();
        res.json({ success: true, message: 'Sync successful' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: error.message });
    } finally { connection.release(); }
});

// --- SPECIAL NUMBERS: STATUS CHANGE WITH AUTOMATIC WA NOTIFICATION ---
router.put('/special-numbers/:id/status', async (req, res) => {
    const { id } = req.params;
    const { isSold } = req.body;
    
    try {
        // 1. Get current state
        const [rows] = await db.execute('SELECT * FROM special_numbers WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Nomor tidak ditemukan' });
        
        const number = rows[0];
        const wasSold = Boolean(number.is_sold);
        const nowSold = Boolean(isSold);

        // 2. Update status
        await db.execute('UPDATE special_numbers SET is_sold = ? WHERE id = ?', [nowSold ? 1 : 0, id]);

        // 3. Send Notification IF status changed from Available to Sold
        if (!wasSold && nowSold) {
            const [settingsRows] = await db.execute('SELECT * FROM whatsapp_settings LIMIT 1');
            if (settingsRows.length > 0) {
                const s = settingsRows[0];
                const message = `📢 *NOTIFIKASI NOMOR TERJUAL*\n\n` +
                                `📱 *Nomor:* ${number.phone_number}\n` +
                                `📍 *Lokasi:* ${number.lokasi || '-'}\n` +
                                `🏷️ *Harga:* Rp ${Number(number.price).toLocaleString('id-ID')}\n` +
                                `🔢 *SN:* ${number.sn || '-'}\n\n` +
                                `✅ Status telah diupdate ke *TERJUAL* oleh sistem.`;
                
                await sendWAMessage(s.recipient_id, message);
            }
        }

        res.json({ message: 'Status updated' });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// --- BOOTSTRAP: Get All Initial Data ---
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
            whatsAppSettings: waSettings.length > 0 ? { webhookUrl: waSettings[0].webhook_url, senderNumber: waSettings[0].sender_number, recipientType: waSettings[0].recipient_type, recipientId: waSettings[0].recipient_id, apiKey: waSettings[0].api_key, sessionName: waSettings[0].session_name, specialNumberRecipient: waSettings[0].special_number_recipient } : null,
            specialNumberBannerUrl,
            locations
        });
    } catch (error) { res.status(500).json({ message: 'Failed to fetch bootstrap data' }); }
});

// --- USERS & OTHER CRUD ---
router.post('/users', async (req, res) => {
    const { id, password, role, profile } = req.body;
    try {
        const hashed = await bcrypt.hash(password, 10);
        await db.execute(`INSERT INTO users (id, password, role, nama, email, phone, tap, points, level, jabatan, salesforce, no_rs, owner, kabupaten, kecamatan, alamat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, hashed, role, profile.nama, profile.email, profile.phone, profile.tap, 0, 'Bronze', profile.jabatan, profile.salesforce, profile.noRs, profile.owner, profile.kabupaten, profile.kecamatan, profile.alamat]);
        res.json({ message: 'User created' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/users/:id/level', async (req, res) => {
    try { await db.execute('UPDATE users SET level = ? WHERE id = ?', [req.body.level, req.params.id]); res.json({ message: 'Level updated' }); } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/users/:id/reset-password', async (req, res) => {
    try {
        const newPass = Math.random().toString(36).slice(-6);
        const hashed = await bcrypt.hash(newPass, 10);
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, req.params.id]);
        res.json({ message: 'Password reset', newPassword: newPass });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/users/:id/points-set', async (req, res) => {
    try { await db.execute('UPDATE users SET points = ? WHERE id = ?', [req.body.points, req.params.id]); res.json({ message: 'Points updated' }); } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/users/:id/points', async (req, res) => {
    const { points, action } = req.body;
    try { const op = action === 'tambah' ? '+' : '-'; await db.execute(`UPDATE users SET points = points ${op} ? WHERE id = ?`, [points, req.params.id]); res.json({ message: 'Points updated' }); } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/transactions', async (req, res) => {
    const { userId, produk, harga, kuantiti, totalPembelian, date } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [u] = await connection.execute('SELECT level FROM users WHERE id = ?', [userId]);
        const [lp] = await connection.execute('SELECT multiplier FROM loyalty_programs WHERE level = ?', [u[0]?.level || 'Bronze']);
        const pts = Math.floor((totalPembelian / 1000) * (lp[0]?.multiplier || 1));
        await connection.execute('INSERT INTO transactions (user_id, date, produk, harga, kuantiti, total_pembelian, points_earned) VALUES (?, ?, ?, ?, ?, ?, ?)', [userId, date, produk, harga, kuantiti, totalPembelian, pts]);
        await connection.execute('UPDATE users SET points = points + ? WHERE id = ?', [pts, userId]);
        await connection.commit();
        res.json({ message: 'Transaction added' });
    } catch (e) { await connection.rollback(); res.status(500).json({ message: e.message }); } finally { connection.release(); }
});

router.put('/loyalty-programs/:level', async (req, res) => {
    try { await db.execute('UPDATE loyalty_programs SET pointsNeeded = ?, benefit = ?, multiplier = ? WHERE level = ?', [req.body.pointsNeeded, req.body.benefit, req.body.multiplier, req.params.level]); res.json({ message: 'Program updated' }); } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/rewards/:id', async (req, res) => {
    try { await db.execute('DELETE FROM rewards WHERE id = ?', [req.params.id]); res.json({ message: 'Reward deleted' }); } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/rewards/reorder', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        for (const item of req.body.orderData) { await connection.execute('UPDATE rewards SET display_order = ? WHERE id = ?', [item.displayOrder, item.id]); }
        await connection.commit(); res.json({ message: 'Reordered' });
    } catch (e) { await connection.rollback(); res.status(500).json({ message: e.message }); } finally { connection.release(); }
});

router.post('/redemptions', async (req, res) => {
    const { userId, rewardId } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [u] = await connection.execute('SELECT points, nama FROM users WHERE id = ?', [userId]);
        const [r] = await connection.execute('SELECT points, stock, name FROM rewards WHERE id = ?', [rewardId]);
        if (u[0].points < r[0].points) throw new Error('Poin tidak cukup');
        if (r[0].stock <= 0) throw new Error('Stok habis');
        await connection.execute('UPDATE users SET points = points - ? WHERE id = ?', [r[0].points, userId]);
        await connection.execute('UPDATE rewards SET stock = stock - 1 WHERE id = ?', [rewardId]);
        await connection.execute('INSERT INTO redemptions (user_id, reward_id, points_spent, date, user_name, reward_name, status) VALUES (?, ?, ?, NOW(), ?, ?, ?)', [userId, rewardId, r[0].points, u[0].nama, r[0].name, 'Diajukan']);
        if (r[0].name.toLowerCase().includes('kupon undian')) {
             await connection.execute('UPDATE users SET kupon_undian = kupon_undian + 1 WHERE id = ?', [userId]);
             const [ra] = await connection.execute('SELECT id FROM raffle_programs WHERE is_active = 1 LIMIT 1');
             if(ra.length > 0) await connection.execute('INSERT INTO coupon_redemptions (user_id, raffle_program_id, redeemed_at) VALUES (?, ?, NOW())', [userId, ra[0].id]);
        }
        await connection.commit(); res.json({ message: 'Redemption successful' });
    } catch (e) { await connection.rollback(); res.status(400).json({ message: e.message }); } finally { connection.release(); }
});

router.post('/redemptions/bulk/status', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        if (req.body.status === 'Ditolak') {
            for (const id of req.body.ids) {
                const [r] = await connection.execute('SELECT reward_id, status FROM redemptions WHERE id = ?', [id]);
                if (r.length > 0 && r[0].status !== 'Ditolak') await connection.execute('UPDATE rewards SET stock = stock + 1 WHERE id = ?', [r[0].reward_id]);
            }
        }
        const ph = req.body.ids.map(() => '?').join(',');
        await connection.execute(`UPDATE redemptions SET status = ?, status_note = ?, status_updated_at = NOW() WHERE id IN (${ph})`, [req.body.status, req.body.statusNote, ...req.body.ids]);
        await connection.commit(); res.json({ message: 'Bulk status updated' });
    } catch (e) { await connection.rollback(); res.status(500).json({ message: e.message }); } finally { connection.release(); }
});

router.post('/special-numbers', async (req, res) => {
    try { await db.execute('INSERT INTO special_numbers (phone_number, price, sn, lokasi, is_sold) VALUES (?, ?, ?, ?, 0)', [req.body.phoneNumber, req.body.price, req.body.sn, req.body.lokasi]); res.json({ message: 'Number added' }); } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/special-numbers/:id', async (req, res) => {
    try { await db.execute('UPDATE special_numbers SET phone_number=?, price=?, sn=?, lokasi=? WHERE id=?', [req.body.phoneNumber, req.body.price, req.body.sn, req.body.lokasi, req.params.id]); res.json({ message: 'Number updated' }); } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/special-numbers/:id', async (req, res) => {
    try { await db.execute('DELETE FROM special_numbers WHERE id = ?', [req.params.id]); res.json({ message: 'Deleted' }); } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/settings/whatsapp', async (req, res) => {
    try { await db.execute('DELETE FROM whatsapp_settings'); await db.execute('INSERT INTO whatsapp_settings (webhook_url, sender_number, recipient_type, recipient_id, api_key, session_name, special_number_recipient) VALUES (?, ?, ?, ?, ?, ?, ?)', [req.body.webhookUrl, req.body.senderNumber, req.body.recipientType, req.body.recipientId, req.body.apiKey, req.body.sessionName, req.body.specialNumberRecipient]); res.json({ message: 'Settings saved' }); } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/raffles', async (req, res) => {
    const connection = await db.getConnection();
    try { await connection.beginTransaction(); if (req.body.isActive) await connection.execute('UPDATE raffle_programs SET is_active = 0'); await connection.execute('INSERT INTO raffle_programs (name, prize, period, is_active) VALUES (?, ?, ?, ?)', [req.body.name, req.body.prize, req.body.period, req.body.isActive]); await connection.commit(); res.json({ message: 'Raffle program added' }); } catch (e) { await connection.rollback(); res.status(500).json({ message: e.message }); } finally { connection.release(); }
});

router.put('/programs/:id/participants', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [curr] = await connection.execute('SELECT user_id FROM running_program_targets WHERE program_id = ?', [req.params.id]);
        const currSet = new Set(curr.map(c => c.user_id));
        const newSet = new Set(req.body.participantIds);
        for (const uid of req.body.participantIds) { if (!currSet.has(uid)) await connection.execute('INSERT INTO running_program_targets (program_id, user_id, progress) VALUES (?, ?, 0)', [req.params.id, uid]); }
        for (const uid of currSet) { if (!newSet.has(uid)) await connection.execute('DELETE FROM running_program_targets WHERE program_id = ? AND user_id = ?', [req.params.id, uid]); }
        await connection.commit(); res.json({ message: 'Participants updated' });
    } catch (e) { await connection.rollback(); res.status(500).json({ message: e.message }); } finally { connection.release(); }
});

router.get('/users/:id/audit', async (req, res) => {
    try {
        const [e] = await db.execute('SELECT SUM(points_earned) as total FROM transactions WHERE user_id=?', [req.params.id]);
        const [s] = await db.execute('SELECT SUM(points_spent) as total FROM redemptions WHERE user_id=? AND status != "Ditolak"', [req.params.id]);
        const [u] = await db.execute('SELECT points FROM users WHERE id=?', [req.params.id]);
        const earned = e[0].total || 0; const spent = s[0].total || 0; const actual = u[0]?.points || 0;
        res.json({ earned, spent, calculated: earned - spent, actual, discrepancy: actual - (earned - spent) });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/audit/fix/:id', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [e] = await connection.execute('SELECT SUM(points_earned) as total FROM transactions WHERE user_id=?', [req.params.id]);
        const [s] = await connection.execute('SELECT SUM(points_spent) as total FROM redemptions WHERE user_id=? AND status = "Selesai"', [req.params.id]);
        let avail = (e[0].total || 0) - (s[0].total || 0);
        const [pr] = await connection.execute('SELECT id, points_spent FROM redemptions WHERE user_id=? AND status IN ("Diajukan", "Diproses") ORDER BY date ASC', [req.params.id]);
        for (const r of pr) {
            if (avail >= r.points_spent) avail -= r.points_spent;
            else {
                await connection.execute('UPDATE redemptions SET status="Ditolak", status_note="Audit: Poin kurang", status_updated_at=NOW() WHERE id=?', [r.id]);
                await connection.execute('UPDATE rewards r JOIN redemptions rd ON r.id = rd.reward_id SET r.stock = r.stock + 1 WHERE rd.id = ?', [r.id]);
            }
        }
        await connection.execute('UPDATE users SET points=? WHERE id=?', [avail, req.params.id]);
        await connection.commit(); res.json({ success: true, message: `Fixed to ${avail}` });
    } catch (err) { await connection.rollback(); res.status(500).json({ message: err.message }); } finally { connection.release(); }
});

router.post('/audit/bulk-fix', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [us] = await connection.execute("SELECT id FROM users WHERE role = 'pelanggan'");
        let f=0; let c=0;
        for (const user of us) {
            const [e] = await connection.execute('SELECT SUM(points_earned) as total FROM transactions WHERE user_id=?', [user.id]);
            const [s] = await connection.execute('SELECT SUM(points_spent) as total FROM redemptions WHERE user_id=? AND status = "Selesai"', [user.id]);
            let avail = (e[0].total || 0) - (s[0].total || 0);
            const [pr] = await connection.execute('SELECT id, points_spent FROM redemptions WHERE user_id=? AND status IN ("Diajukan", "Diproses") ORDER BY date ASC', [user.id]);
            for (const r of pr) {
                if (avail >= r.points_spent) avail -= r.points_spent;
                else {
                    await connection.execute('UPDATE redemptions SET status="Ditolak", status_note="Audit: Poin kurang", status_updated_at=NOW() WHERE id=?', [r.id]);
                    await connection.execute('UPDATE rewards r JOIN redemptions rd ON r.id = rd.reward_id SET r.stock = r.stock + 1 WHERE rd.id = ?', [r.id]);
                    c++;
                }
            }
            const [cu] = await connection.execute('SELECT points FROM users WHERE id=?', [user.id]);
            if (cu[0].points !== avail) { await connection.execute('UPDATE users SET points=? WHERE id=?', [avail, user.id]); f++; }
        }
        await connection.commit(); res.json({ message: 'Audit complete', report: { processed: us.length, fixed: f, cancelled: c } });
    } catch (e) { await connection.rollback(); res.status(500).json({ message: e.message }); } finally { connection.release(); }
});

module.exports = { router, uploadRouter };
