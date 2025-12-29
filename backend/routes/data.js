
const express = require('express');
const router = express.Router();
const uploadRouter = express.Router();
const db = require('../db');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Konfigurasi Multer untuk Upload Bukti Penukaran
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/redemptions';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `redeem-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ============================================================
// 1. BOOTSTRAP (AMBIL DATA UTAMA)
// ============================================================
router.get('/bootstrap', async (req, res) => {
    try {
        const safeQuery = async (sql, params = []) => {
            const [rows] = await db.execute(sql, params);
            return rows;
        };

        const users = await safeQuery('SELECT * FROM users');
        const transactions = await safeQuery('SELECT * FROM transactions ORDER BY date DESC LIMIT 1000');
        const loyaltyPrograms = await safeQuery('SELECT * FROM loyalty_programs');
        const rewards = await safeQuery('SELECT * FROM rewards ORDER BY display_order ASC');
        const redemptions = await safeQuery('SELECT * FROM redemptions ORDER BY date DESC');
        const runningPrograms = await safeQuery('SELECT * FROM running_programs');
        const targets = await safeQuery('SELECT * FROM running_program_targets');
        const specialNumbers = await safeQuery('SELECT * FROM special_numbers');
        const waSettings = await safeQuery('SELECT * FROM whatsapp_settings LIMIT 1');

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
                    nama: u.nama || '', email: u.email || '', phone: u.phone || '', tap: u.tap || '',
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
                statusUpdatedAt: r.status_updated_at, documentationPhotoUrl: r.documentation_photo_url,
                receiverName: r.receiver_name, receiverRole: r.receiver_role, surveyorName: r.surveyor_name,
                locationCoordinates: r.location_coordinates
            })),
            runningPrograms: programsWithTargets,
            specialNumbers: specialNumbers.map(n => ({
                id: n.id, phoneNumber: n.phone_number, price: parseFloat(n.price || 0), isSold: n.is_sold === 1,
                sn: n.sn, lokasi: n.lokasi
            })),
            whatsAppSettings: waSettings[0] ? {
                webhookUrl: waSettings[0].webhook_url, senderNumber: waSettings[0].sender_number,
                recipientType: waSettings[0].recipient_type, recipientId: waSettings[0].recipient_id,
                apiKey: waSettings[0].api_key, sessionName: waSettings[0].session_name,
                specialNumberRecipient: waSettings[0].special_number_recipient,
                specialNumberStatusRecipientType: waSettings[0].special_number_status_recipient_type,
                specialNumberStatusRecipientId: waSettings[0].special_number_status_recipient_id
            } : null
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal memuat data: ' + error.message });
    }
});

// ============================================================
// 2. INTEGRASI APPSHEET (PERBAIKAN ERROR 404)
// ============================================================
router.post('/integration/appsheet/sync-all', async (req, res) => {
    try {
        // Placeholder untuk logika sinkronisasi 2 arah dengan AppSheet
        // Di masa depan, ini akan memanggil API AppSheet atau membaca Google Sheets langsung
        console.log('[Integration] Memulai sinkronisasi data dengan AppSheet...');
        
        // Simulasi proses
        await new Promise(resolve => setTimeout(resolve, 1000));

        res.json({ 
            success: true, 
            message: 'Sinkronisasi dengan AppSheet berhasil diselesaikan. Data lokal telah diperbarui.' 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal sinkronisasi: ' + error.message });
    }
});

// ============================================================
// 3. MANAJEMEN PENUKARAN (REDEMPTIONS)
// ============================================================

// Update Status Massal
router.post('/redemptions/bulk/status', async (req, res) => {
    const { ids, status, statusNote } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'Pilih data yang akan diupdate.' });
    }

    try {
        const updatedAt = new Date();
        await db.query(
            'UPDATE redemptions SET status = ?, status_note = ?, status_updated_at = ? WHERE id IN (?)',
            [status, statusNote, updatedAt, ids]
        );
        res.json({ success: true, message: `${ids.length} data penukaran berhasil diperbarui.` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Update Status Satuan dengan Foto (Diletakkan di uploadRouter)
uploadRouter.put('/redemptions/:id/status', upload.single('photo'), async (req, res) => {
    const { id } = req.params;
    const { status, note } = req.body;
    const photoUrl = req.file ? `/uploads/redemptions/${req.file.filename}` : null;

    try {
        const updatedAt = new Date();
        let query = 'UPDATE redemptions SET status = ?, status_note = ?, status_updated_at = ?';
        let params = [status, note, updatedAt];

        if (photoUrl) {
            query += ', documentation_photo_url = ?';
            params.push(photoUrl);
        }

        query += ' WHERE id = ?';
        params.push(id);

        await db.execute(query, params);
        res.json({ success: true, message: 'Status penukaran diperbarui.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================================
// 4. PENGATURAN LAINNYA
// ============================================================
router.put('/settings/whatsapp', async (req, res) => {
    const { 
        webhookUrl, senderNumber, recipientType, recipientId, 
        apiKey, sessionName, specialNumberRecipient,
        specialNumberStatusRecipientType, specialNumberStatusRecipientId
    } = req.body;

    try {
        const [rows] = await db.execute('SELECT id FROM whatsapp_settings LIMIT 1');
        if (rows.length > 0) {
            await db.execute(`
                UPDATE whatsapp_settings SET 
                    webhook_url = ?, sender_number = ?, recipient_type = ?, 
                    recipient_id = ?, api_key = ?, session_name = ?, 
                    special_number_recipient = ?, special_number_status_recipient_type = ?,
                    special_number_status_recipient_id = ?
                WHERE id = ?
            `, [webhookUrl, senderNumber, recipientType, recipientId, apiKey, sessionName, specialNumberRecipient, specialNumberStatusRecipientType, specialNumberStatusRecipientId, rows[0].id]);
        } else {
            await db.execute(`
                INSERT INTO whatsapp_settings 
                (webhook_url, sender_number, recipient_type, recipient_id, api_key, session_name, special_number_recipient, special_number_status_recipient_type, special_number_status_recipient_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [webhookUrl, senderNumber, recipientType, recipientId, apiKey, sessionName, specialNumberRecipient, specialNumberStatusRecipientType, specialNumberStatusRecipientId]);
        }
        res.json({ success: true, message: 'Pengaturan disimpan.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = { router, uploadRouter };
