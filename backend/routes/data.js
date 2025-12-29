
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
                location_coordinates: r.location_coordinates
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
            `, [
                webhookUrl, senderNumber, recipientType, recipientId, 
                apiKey, sessionName, specialNumberRecipient, 
                specialNumberStatusRecipientType, specialNumberStatusRecipientId, 
                rows[0].id
            ]);
        } else {
            await db.execute(`
                INSERT INTO whatsapp_settings 
                (webhook_url, sender_number, recipient_type, recipient_id, api_key, session_name, special_number_recipient, special_number_status_recipient_type, special_number_status_recipient_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                webhookUrl, senderNumber, recipientType, recipientId, 
                apiKey, sessionName, specialNumberRecipient, 
                specialNumberStatusRecipientType, specialNumberStatusRecipientId
            ]);
        }
        res.json({ success: true, message: 'Pengaturan disimpan.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ... Sisa file tetap sama ...
module.exports = { router, uploadRouter };
