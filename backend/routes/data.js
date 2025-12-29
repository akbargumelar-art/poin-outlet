
const express = require('express');
const router = express.Router();
const uploadRouter = express.Router();
const db = require('../db');
const axios = require('axios');

// ============================================================
// 1. BOOTSTRAP (AMBIL DATA UTAMA - ANTI BLANK)
// ============================================================
router.get('/bootstrap', async (req, res) => {
    console.log('[API] Bootstrap: Memulai pengambilan data...');
    try {
        const safeQuery = async (sql, params = []) => {
            try {
                const [rows] = await db.execute(sql, params);
                return rows;
            } catch (err) {
                console.error(`[DB Error] Query Gagal: ${sql}`, err.message);
                return []; 
            }
        };

        const users = await safeQuery('SELECT * FROM users');
        const transactions = await safeQuery('SELECT * FROM transactions ORDER BY date DESC LIMIT 500');
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
                id: u.id,
                role: u.role,
                points: u.points || 0,
                level: u.level || 'Bronze',
                kuponUndian: u.kupon_undian || 0,
                profile: {
                    nama: u.nama || '',
                    email: u.email || '',
                    phone: u.phone || '',
                    tap: u.tap || '',
                    salesforce: u.salesforce || '',
                    noRs: u.no_rs || '',
                    owner: u.owner || '',
                    kabupaten: u.kabupaten || '',
                    kecamatan: u.kecamatan || '',
                    alamat: u.alamat || '',
                    jabatan: u.jabatan || '',
                    photoUrl: u.photo_url
                }
            })),
            transactions: transactions.map(t => ({
                id: t.id,
                userId: t.user_id,
                date: t.date,
                produk: t.produk,
                totalPembelian: t.total_pembelian,
                pointsEarned: t.points_earned,
                harga: t.harga,
                kuantiti: t.kuantiti
            })),
            loyaltyPrograms: loyaltyPrograms.map(p => ({
                level: p.level,
                pointsNeeded: p.pointsNeeded,
                benefit: p.benefit,
                multiplier: parseFloat(p.multiplier || 1)
            })),
            rewards: rewards.map(r => ({
                id: r.id,
                name: r.name,
                points: r.points,
                imageUrl: r.image_url,
                stock: r.stock
            })),
            redemptions: redemptions.map(r => ({
                id: r.id,
                userId: r.user_id,
                rewardId: r.reward_id,
                rewardName: r.reward_name,
                userName: r.user_name,
                pointsSpent: r.points_spent,
                date: r.date,
                status: r.status,
                statusNote: r.status_note,
                statusUpdatedAt: r.status_updated_at,
                documentationPhotoUrl: r.documentation_photo_url,
                receiverName: r.receiver_name,
                receiverRole: r.receiver_role,
                surveyorName: r.surveyor_name,
                locationCoordinates: r.location_coordinates
            })),
            runningPrograms: programsWithTargets,
            specialNumbers: specialNumbers.map(n => ({
                id: n.id,
                phoneNumber: n.phone_number,
                price: parseFloat(n.price || 0),
                isSold: n.is_sold === 1,
                sn: n.sn,
                lokasi: n.lokasi
            })),
            whatsAppSettings: waSettings[0] || null
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal memuat data: ' + error.message });
    }
});

// ============================================================
// 2. SETTINGS: WHATSAPP
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

// ============================================================
// 3. APPSHEET SYNC (SINKRONISASI DUA ARAH - ROBUST)
// ============================================================
router.post('/integration/appsheet/sync-all', async (req, res) => {
    const APPSHEET_APP_ID = process.env.APPSHEET_APP_ID;
    const APPSHEET_ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY;

    if (!APPSHEET_APP_ID || !APPSHEET_ACCESS_KEY) {
        return res.status(400).json({ success: false, message: 'Kredensial AppSheet tidak ditemukan.' });
    }

    try {
        const tableName = encodeURIComponent('Tracking Tukar Poin');
        const appsheetUrl = `https://api.appsheet.com/api/v1/apps/${APPSHEET_APP_ID}/tables/${tableName}/Action`;
        
        const response = await axios.post(appsheetUrl, {
            "Action": "Find",
            "Properties": { "Locale": "id-ID" },
            "Rows": []
        }, {
            headers: { "ApplicationAccessKey": APPSHEET_ACCESS_KEY, "Content-Type": "application/json" },
            timeout: 30000 
        });

        let appsheetRows = response.data;

        // PENANGANAN RESPON APPSHEET YANG BERBEDA-BEDA
        // Kadang berupa Array, kadang berupa Objek Metadata
        if (!Array.isArray(appsheetRows)) {
            if (appsheetRows && Array.isArray(appsheetRows.Rows)) {
                appsheetRows = appsheetRows.Rows;
            } else if (appsheetRows && appsheetRows.Success === true && (appsheetRows.RowValues === null || !appsheetRows.RowValues)) {
                return res.json({ success: true, message: "Koneksi Berhasil, tetapi tidak ada data baru di AppSheet yang bisa ditarik." });
            } else {
                return res.status(400).json({ success: false, message: `Respon AppSheet tidak valid: ${JSON.stringify(appsheetRows)}` });
            }
        }

        let updateCount = 0;
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            for (const row of appsheetRows) {
                const redeemId = row['ID Redeem'];
                if (!redeemId) continue;

                const photo = row['Photo Dokumentasi'] || '';
                const loc = row['Long - Lat'] || '';
                const surveyor = row['Nama Surveyor'] || '';
                const receiver = row['Nama Penerima'] || '';

                if (photo || loc) {
                    const [result] = await connection.execute(
                        `UPDATE redemptions SET 
                            status = 'Selesai', 
                            documentation_photo_url = ?, 
                            location_coordinates = ?, 
                            surveyor_name = ?,
                            receiver_name = ?,
                            status_updated_at = NOW()
                         WHERE id = ? AND (documentation_photo_url IS NULL OR documentation_photo_url = '')`,
                        [photo, loc, surveyor, receiver, redeemId]
                    );
                    if (result.affectedRows > 0) updateCount++;
                }
            }
            await connection.commit();
            res.json({ success: true, message: `Sinkronisasi Selesai! ${updateCount} data diperbarui.` });
        } catch (dbErr) {
            await connection.rollback();
            throw dbErr;
        } finally {
            connection.release();
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal: ' + error.message });
    }
});

module.exports = { router, uploadRouter };
