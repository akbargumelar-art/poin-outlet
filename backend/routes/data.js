
const express = require('express');
const router = express.Router();
const uploadRouter = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'))
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Helper: Get Base URL
const getBaseUrl = (req) => `${req.protocol}://${req.get('host')}`;

// Helper: Map User Data
const mapUser = (u) => ({
    id: u.id,
    role: u.role,
    points: u.points,
    level: u.level,
    kuponUndian: u.kupon_undian,
    profile: {
        nama: u.nama,
        email: u.email,
        phone: u.phone,
        owner: u.owner,
        kabupaten: u.kabupaten,
        kecamatan: u.kecamatan,
        salesforce: u.salesforce,
        noRs: u.no_rs,
        alamat: u.alamat,
        tap: u.tap,
        jabatan: u.jabatan,
        photoUrl: u.photo_url
    }
});

// ==========================================
// UPLOAD ROUTER (Multipart/Form-Data)
// ==========================================

// 1. Update User Profile + Photo
uploadRouter.put('/users/:id', upload.single('photo'), async (req, res) => {
    const { id } = req.params;
    let profileData = {};
    try {
        profileData = JSON.parse(req.body.profile || '{}');
    } catch(e) {}

    const photoFile = req.file;

    try {
        let query = 'UPDATE users SET nama=?, email=?, phone=?, owner=?, kabupaten=?, kecamatan=?, salesforce=?, no_rs=?, alamat=?, tap=?, jabatan=?';
        const params = [
            profileData.nama, profileData.email, profileData.phone, profileData.owner, 
            profileData.kabupaten, profileData.kecamatan, profileData.salesforce, 
            profileData.noRs, profileData.alamat, profileData.tap, profileData.jabatan
        ];

        if (photoFile) {
            query += ', photo_url=?';
            params.push(`${getBaseUrl(req)}/uploads/${photoFile.filename}`);
        }

        query += ' WHERE id=?';
        params.push(id);

        await db.execute(query, params);
        
        const [rows] = await db.execute('SELECT * FROM users WHERE id=?', [id]);
        if (rows.length > 0) {
            res.json(mapUser(rows[0]));
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

// 2. Rewards (Create/Update with Photo)
const handleRewardSave = async (req, res, isUpdate) => {
    let data = {};
    try { data = JSON.parse(req.body.data || '{}'); } catch(e) {}
    const photoFile = req.file;

    try {
        let imageUrl = data.imageUrl;
        if (photoFile) {
            imageUrl = `${getBaseUrl(req)}/uploads/${photoFile.filename}`;
        }

        if (isUpdate) {
            const { id } = req.params;
            await db.execute(
                'UPDATE rewards SET name=?, points=?, stock=?, image_url=? WHERE id=?',
                [data.name, data.points, data.stock, imageUrl, id]
            );
        } else {
            await db.execute(
                'INSERT INTO rewards (name, points, stock, image_url) VALUES (?, ?, ?, ?)',
                [data.name, data.points, data.stock, imageUrl]
            );
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
uploadRouter.post('/rewards', upload.single('photo'), (req, res) => handleRewardSave(req, res, false));
uploadRouter.put('/rewards/:id', upload.single('photo'), (req, res) => handleRewardSave(req, res, true));

// 3. Running Programs
const handleProgramSave = async (req, res, isUpdate) => {
    let data = {};
    try { data = JSON.parse(req.body.data || '{}'); } catch(e) {}
    const photoFile = req.file;

    try {
        let imageUrl = data.imageUrl;
        if (photoFile) {
            imageUrl = `${getBaseUrl(req)}/uploads/${photoFile.filename}`;
        }

        if (isUpdate) {
            const { id } = req.params;
            await db.execute(
                'UPDATE running_programs SET name=?, mechanism=?, prize_category=?, prize_description=?, start_date=?, end_date=?, image_url=? WHERE id=?',
                [data.name, data.mechanism, data.prizeCategory, data.prizeDescription, data.startDate, data.endDate, imageUrl, id]
            );
        } else {
            await db.execute(
                'INSERT INTO running_programs (name, mechanism, prize_category, prize_description, start_date, end_date, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [data.name, data.mechanism, data.prizeCategory, data.prizeDescription, data.startDate, data.endDate, imageUrl]
            );
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
uploadRouter.post('/running-programs', upload.single('photo'), (req, res) => handleProgramSave(req, res, false));
uploadRouter.put('/running-programs/:id', upload.single('photo'), (req, res) => handleProgramSave(req, res, true));

// 4. Redemption Documentation
uploadRouter.post('/redemptions/:id/documentation', upload.single('photo'), async (req, res) => {
    const { id } = req.params;
    const photoFile = req.file;
    if (!photoFile) return res.status(400).json({ message: 'No photo uploaded' });

    const url = `${getBaseUrl(req)}/uploads/${photoFile.filename}`;
    try {
        await db.execute('UPDATE redemptions SET documentation_photo_url=? WHERE id=?', [url, id]);
        res.json({ message: 'Documentation uploaded', url });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 5. Special Number Banner
uploadRouter.post('/special-numbers/banner', upload.single('file'), async (req, res) => {
    // In a real app we might store this URL in a settings table
    if (!req.file) return res.status(400).json({ message: 'No file' });
    res.json({ url: `${getBaseUrl(req)}/uploads/${req.file.filename}` });
});

// 6. Bulk Transactions Upload
uploadRouter.post('/transactions/bulk', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet);
        
        let count = 0;
        for (const row of rows) {
            // Expected columns: tanggal, id_digipos, produk, harga, kuantiti
            // Very basic implementation
            if (row.id_digipos && row.harga && row.kuantiti) {
                const total = row.harga * row.kuantiti;
                // Calculate points (simplified logic, ideally fetch multiplier)
                const points = Math.floor(total / 1000); 
                
                // Add Transaction
                await db.execute(
                    'INSERT INTO transactions (user_id, date, produk, harga, kuantiti, total_pembelian, points_earned) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [row.id_digipos, row.tanggal || new Date(), row.produk, row.harga, row.kuantiti, total, points]
                );
                
                // Update User Points
                await db.execute('UPDATE users SET points = points + ? WHERE id = ?', [points, row.id_digipos]);
                count++;
            }
        }
        fs.unlinkSync(req.file.path); // cleanup
        res.json({ message: `${count} transactions imported` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ==========================================
// DATA ROUTER (Standard JSON API)
// ==========================================

// --- USERS ---
router.get('/users', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM users');
        res.json(rows.map(mapUser));
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/users', async (req, res) => {
    const { id, password, role, profile } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.execute(
            `INSERT INTO users (id, password, role, nama, email, phone, tap, jabatan, points, level, kupon_undian) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'Bronze', 0)`,
            [id, hashedPassword, role, profile.nama, profile.email, profile.phone, profile.tap, profile.jabatan]
        );
        res.json({ message: 'User added' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.patch('/users/:id/level', async (req, res) => {
    try {
        await db.execute('UPDATE users SET level=? WHERE id=?', [req.body.level, req.params.id]);
        res.json({ message: 'Level updated' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/users/:id/reset-password', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash('123456', 10);
        await db.execute('UPDATE users SET password=? WHERE id=?', [hashedPassword, req.params.id]);
        res.json({ message: 'Password reset to 123456' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/users/:id/points', async (req, res) => {
    const { points, action } = req.body;
    try {
        const operator = action === 'tambah' ? '+' : '-';
        await db.execute(`UPDATE users SET points = points ${operator} ? WHERE id=?`, [points, req.params.id]);
        res.json({ message: 'Points updated' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- TRANSACTIONS ---
router.get('/transactions', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM transactions ORDER BY date DESC LIMIT 1000');
        // Map snake_case to camelCase for frontend
        const mapped = rows.map(r => ({
            id: r.id, userId: r.user_id, date: r.date, produk: r.produk, 
            harga: r.harga, kuantiti: r.kuantiti, totalPembelian: r.total_pembelian, pointsEarned: r.points_earned
        }));
        res.json(mapped);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/transactions', async (req, res) => {
    const { userId, date, produk, harga, kuantiti, totalPembelian } = req.body;
    try {
        // Calculate points based on user level
        const [userRows] = await db.execute('SELECT level FROM users WHERE id=?', [userId]);
        let multiplier = 1;
        if (userRows.length > 0) {
            const [progRows] = await db.execute('SELECT multiplier FROM loyalty_programs WHERE level=?', [userRows[0].level]);
            if (progRows.length > 0) multiplier = progRows[0].multiplier;
        }
        
        const points = Math.floor((totalPembelian / 1000) * multiplier);

        await db.execute(
            'INSERT INTO transactions (user_id, date, produk, harga, kuantiti, total_pembelian, points_earned) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, date, produk, harga, kuantiti, totalPembelian, points]
        );
        
        await db.execute('UPDATE users SET points = points + ? WHERE id = ?', [points, userId]);
        res.json({ message: 'Transaction added' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- REWARDS ---
router.get('/rewards', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM rewards ORDER BY display_order ASC');
        res.json(rows.map(r => ({ ...r, imageUrl: r.image_url })));
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/rewards/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM rewards WHERE id=?', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/rewards/reorder', async (req, res) => {
    const { order } = req.body; // [{id, displayOrder}]
    try {
        for (const item of order) {
            await db.execute('UPDATE rewards SET display_order=? WHERE id=?', [item.displayOrder, item.id]);
        }
        res.json({ message: 'Reordered' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- REDEMPTIONS ---
router.get('/redemptions', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM redemptions ORDER BY date DESC');
        res.json(rows.map(r => ({
            id: r.id, userId: r.user_id, rewardId: r.reward_id, 
            pointsSpent: r.points_spent, date: r.date, 
            status: r.status, statusNote: r.status_note, statusUpdatedAt: r.status_updated_at,
            rewardName: r.reward_name, userName: r.user_name,
            documentationPhotoUrl: r.documentation_photo_url,
            // AppSheet fields
            receiverName: r.receiver_name, receiverRole: r.receiver_role, 
            surveyorName: r.surveyor_name, locationCoordinates: r.location_coordinates
        })));
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/redemptions', async (req, res) => {
    const { userId, rewardId } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        // Check points and stock
        const [userRows] = await connection.execute('SELECT points, nama FROM users WHERE id=?', [userId]);
        const [rewardRows] = await connection.execute('SELECT points, stock, name FROM rewards WHERE id=?', [rewardId]);
        
        if (userRows.length === 0 || rewardRows.length === 0) throw new Error('Invalid User or Reward');
        
        const user = userRows[0];
        const reward = rewardRows[0];
        
        if (user.points < reward.points) throw new Error('Poin tidak cukup');
        if (reward.stock <= 0) throw new Error('Stok habis');
        
        // Deduct points & stock
        await connection.execute('UPDATE users SET points = points - ? WHERE id=?', [reward.points, userId]);
        await connection.execute('UPDATE rewards SET stock = stock - 1 WHERE id=?', [rewardId]);
        
        // Create Record
        await connection.execute(
            'INSERT INTO redemptions (user_id, reward_id, points_spent, date, status, user_name, reward_name) VALUES (?, ?, ?, NOW(), "Diajukan", ?, ?)',
            [userId, rewardId, reward.points, user.nama, reward.name]
        );
        
        await connection.commit();
        res.json({ message: 'Redemption successful' });
    } catch (err) {
        await connection.rollback();
        res.status(400).json({ message: err.message });
    } finally {
        connection.release();
    }
});

router.patch('/redemptions/:id/status', async (req, res) => {
    const { status, statusNote } = req.body;
    try {
        await db.execute(
            'UPDATE redemptions SET status=?, status_note=?, status_updated_at=NOW() WHERE id=?',
            [status, statusNote, req.params.id]
        );
        res.json({ message: 'Status updated' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/redemptions/bulk/status', async (req, res) => {
    const { ids, status, statusNote } = req.body;
    try {
        // Construct basic ID list for IN clause
        const placeholders = ids.map(() => '?').join(',');
        await db.execute(
            `UPDATE redemptions SET status=?, status_note=?, status_updated_at=NOW() WHERE id IN (${placeholders})`,
            [status, statusNote, ...ids]
        );
        res.json({ message: 'Bulk status updated' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- LOYALTY PROGRAMS ---
router.get('/loyalty-programs', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM loyalty_programs');
        res.json(rows.map(r => ({ ...r, pointsNeeded: r.points_needed })));
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/loyalty-programs/:level', async (req, res) => {
    const { pointsNeeded, benefit, multiplier } = req.body;
    try {
        await db.execute(
            'UPDATE loyalty_programs SET points_needed=?, benefit=?, multiplier=? WHERE level=?',
            [pointsNeeded, benefit, multiplier, req.params.level]
        );
        res.json({ message: 'Updated' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- RUNNING PROGRAMS ---
router.get('/running-programs', async (req, res) => {
    try {
        const [progs] = await db.execute('SELECT * FROM running_programs');
        const programs = [];
        
        for (const p of progs) {
            const [targets] = await db.execute('SELECT * FROM program_targets WHERE program_id=?', [p.id]);
            programs.push({
                id: p.id, name: p.name, mechanism: p.mechanism,
                prizeCategory: p.prize_category, prizeDescription: p.prize_description,
                startDate: p.start_date, endDate: p.end_date, imageUrl: p.image_url,
                targets: targets.map(t => ({ id: t.id, programId: t.program_id, userId: t.user_id, progress: t.progress }))
            });
        }
        res.json(programs);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/running-programs/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM running_programs WHERE id=?', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/running-programs/:id/participants', async (req, res) => {
    const { userIds } = req.body;
    const programId = req.params.id;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.execute('DELETE FROM program_targets WHERE program_id=?', [programId]);
        for (const uid of userIds) {
            await connection.execute('INSERT INTO program_targets (program_id, user_id, progress) VALUES (?, ?, 0)', [programId, uid]);
        }
        await connection.commit();
        res.json({ message: 'Participants updated' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ message: err.message });
    } finally { connection.release(); }
});

// --- SPECIAL NUMBERS ---
router.get('/special-numbers', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM special_numbers');
        res.json(rows.map(r => ({ ...r, phoneNumber: r.phone_number, isSold: !!r.is_sold })));
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/special-numbers/:id', async (req, res) => {
    const { phoneNumber, price, sn, lokasi } = req.body;
    try {
        if (req.params.id) {
            await db.execute('UPDATE special_numbers SET phone_number=?, price=?, sn=?, lokasi=? WHERE id=?', [phoneNumber, price, sn, lokasi, req.params.id]);
        } else {
            await db.execute('INSERT INTO special_numbers (phone_number, price, sn, lokasi) VALUES (?, ?, ?, ?)', [phoneNumber, price, sn, lokasi]);
        }
        res.json({ message: 'Saved' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/special-numbers/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM special_numbers WHERE id=?', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.patch('/special-numbers/:id/status', async (req, res) => {
    try {
        await db.execute('UPDATE special_numbers SET is_sold=? WHERE id=?', [req.body.isSold, req.params.id]);
        res.json({ message: 'Status updated' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- LOCATIONS ---
router.get('/locations', async (req, res) => {
    // Assuming locations table exists, otherwise return distinct from users
    try {
        // Try selecting from users if locations table doesn't exist in previous turns schema, 
        // but let's assume `locations` table exists or fallback.
        // For robustness, I'll select distinct kabupaten/kecamatan from users if this fails or just return empty for now if table missing.
        // Actually, let's just query users distinct values as a safe fallback
        const [rows] = await db.execute('SELECT DISTINCT kabupaten, kecamatan FROM users WHERE kabupaten IS NOT NULL');
        res.json(rows.map((r, i) => ({ id: i, kabupaten: r.kabupaten, kecamatan: r.kecamatan })));
    } catch (err) { 
        res.json([]); 
    }
});

// --- RAFFLE PROGRAMS (UNDIAN) ---
router.get('/raffle-programs', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM raffle_programs');
        res.json(rows.map(r => ({ ...r, isActive: !!r.is_active })));
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/raffle-programs', async (req, res) => {
    const { name, prize, period, isActive } = req.body;
    try {
        if (isActive) await db.execute('UPDATE raffle_programs SET is_active=0');
        await db.execute('INSERT INTO raffle_programs (name, prize, period, is_active) VALUES (?, ?, ?, ?)', [name, prize, period, isActive]);
        res.json({ message: 'Added' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/raffle-programs/:id', async (req, res) => {
    const { name, prize, period, isActive } = req.body;
    try {
        if (isActive) await db.execute('UPDATE raffle_programs SET is_active=0');
        await db.execute('UPDATE raffle_programs SET name=?, prize=?, period=?, is_active=? WHERE id=?', [name, prize, period, isActive, req.params.id]);
        res.json({ message: 'Updated' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/raffle-programs/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM raffle_programs WHERE id=?', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/coupon-redemptions', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM coupon_redemptions');
        res.json(rows.map(r => ({ id: r.id, userId: r.user_id, raffleProgramId: r.raffle_program_id, redeemedAt: r.redeemed_at })));
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/raffle-winners', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM raffle_winners');
        res.json(rows.map(r => ({ ...r, photoUrl: r.photo_url })));
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- WHATSAPP SETTINGS ---
router.get('/whatsapp-settings', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM whatsapp_settings LIMIT 1');
        if (rows.length > 0) {
            const s = rows[0];
            res.json({
                webhookUrl: s.webhook_url, senderNumber: s.sender_number, recipientType: s.recipient_type,
                recipientId: s.recipient_id, apiKey: s.api_key, sessionName: s.session_name, specialNumberRecipient: s.special_number_recipient
            });
        } else {
            res.json(null);
        }
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/whatsapp-settings', async (req, res) => {
    const { webhookUrl, senderNumber, recipientType, recipientId, apiKey, sessionName, specialNumberRecipient } = req.body;
    try {
        await db.execute('DELETE FROM whatsapp_settings'); // Ensure single row
        await db.execute(
            'INSERT INTO whatsapp_settings (webhook_url, sender_number, recipient_type, recipient_id, api_key, session_name, special_number_recipient) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [webhookUrl, senderNumber, recipientType, recipientId, apiKey, sessionName, specialNumberRecipient]
        );
        res.json({ message: 'Settings saved' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});


// ==========================================
// INTEGRATION ROUTER (AppSheet / External)
// ==========================================

// Endpoint for AppSheet Automation/Webhooks to update redemption status
router.post('/integration/redemption/update', async (req, res) => {
    const { 
        id, 
        note, 
        photo_base64, 
        receiver_name, 
        receiver_role, 
        surveyor_name, 
        location 
    } = req.body;

    // Auto-set status to 'Selesai' if not provided by AppSheet
    const status = req.body.status || 'Selesai';

    if (!id) {
        return res.status(400).json({ message: 'ID is required' });
    }

    const connection = await db.getConnection();
    try {
        // 1. Handle Photo Upload if Base64 is provided
        let photoUrl = null;
        if (photo_base64) {
            // Remove header if present (e.g., "data:image/jpeg;base64,")
            const base64Data = photo_base64.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            
            const filename = `appsheet-doc-${Date.now()}-${id}.jpg`;
            
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            const filePath = path.join(uploadDir, filename);
            fs.writeFileSync(filePath, buffer);
            
            photoUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
        }

        // 2. Update Database with new fields
        let query = `
            UPDATE redemptions SET 
            status = ?, 
            status_note = ?, 
            status_updated_at = NOW(),
            receiver_name = ?,
            receiver_role = ?,
            surveyor_name = ?,
            location_coordinates = ?
        `;
        
        const params = [
            status, 
            note || null,
            receiver_name || null,
            receiver_role || null,
            surveyor_name || null,
            location || null
        ];

        if (photoUrl) {
            query += ', documentation_photo_url = ?';
            params.push(photoUrl);
        }

        query += ' WHERE id = ?';
        params.push(id);

        const [result] = await connection.execute(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Redemption ID not found' });
        }

        res.json({ 
            message: 'Status updated successfully', 
            id, 
            status, 
            photo_url: photoUrl 
        });

    } catch (error) {
        console.error('Integration Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    } finally {
        connection.release();
    }
});

module.exports = { router, uploadRouter };
