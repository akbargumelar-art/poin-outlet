
const express = require('express');
const router = express.Router();
const uploadRouter = express.Router();
const db = require('../db');
const axios = require('axios');

// ============================================================
// 1. BOOTSTRAP (AMBIL DATA UTAMA UNTUK DASHBOARD)
// ============================================================
router.get('/bootstrap', async (req, res) => {
    console.log('[API] Bootstrap: Memulai pengambilan data...');
    try {
        // Eksekusi semua query secara paralel untuk kecepatan
        const [
            [users],
            [transactions],
            [loyaltyPrograms],
            [rewards],
            [redemptions],
            [runningPrograms],
            [targets],
            [specialNumbers],
            [waSettings]
        ] = await Promise.all([
            db.execute('SELECT * FROM users'),
            db.execute('SELECT * FROM transactions ORDER BY date DESC LIMIT 500'),
            db.execute('SELECT * FROM loyalty_programs'),
            db.execute('SELECT * FROM rewards ORDER BY display_order ASC'),
            db.execute('SELECT * FROM redemptions ORDER BY date DESC'),
            db.execute('SELECT * FROM running_programs'),
            db.execute('SELECT * FROM running_program_targets'),
            db.execute('SELECT * FROM special_numbers'),
            db.execute('SELECT * FROM whatsapp_settings LIMIT 1')
        ]);

        console.log(`[API] Bootstrap: Berhasil mengambil ${users.length} user dan ${redemptions.length} data penukaran.`);

        // Mapping targets ke program
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
        console.error('[API] Bootstrap Fatal Error:', error);
        res.status(500).json({ success: false, message: 'Gagal memuat data awal: ' + error.message });
    }
});

// ============================================================
// 2. APPSHEET SYNC (SINKRONISASI DUA ARAH)
// ============================================================
router.post('/integration/appsheet/sync-all', async (req, res) => {
    const APPSHEET_APP_ID = process.env.APPSHEET_APP_ID;
    const APPSHEET_ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY;

    console.log('[Sync] Memulai sinkronisasi AppSheet...');

    if (!APPSHEET_APP_ID || !APPSHEET_ACCESS_KEY) {
        return res.status(400).json({ success: false, message: 'Kredensial AppSheet tidak ditemukan di ENV server.' });
    }

    try {
        const appsheetUrl = `https://api.appsheet.com/api/v1/apps/${APPSHEET_APP_ID}/tables/Tracking Tukar Poin/Action`;
        
        const response = await axios.post(appsheetUrl, {
            "Action": "Find",
            "Properties": { "Locale": "id-ID" },
            "Rows": []
        }, {
            headers: { "ApplicationAccessKey": APPSHEET_ACCESS_KEY },
            timeout: 20000 
        });

        const appsheetRows = response.data;

        if (!Array.isArray(appsheetRows)) {
            console.error('[Sync] Respon AppSheet bukan array:', appsheetRows);
            return res.status(400).json({ 
                success: false, 
                message: 'Gagal: Tabel "Tracking Tukar Poin" tidak ditemukan atau Access Key ditolak AppSheet.' 
            });
        }

        let updateCount = 0;
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            for (const row of appsheetRows) {
                const redeemId = row['ID Redeem'];
                if (!redeemId) continue;

                // Ambil data foto & lokasi dari AppSheet
                const photo = row['Photo Dokumentasi'] || '';
                const loc = row['Long - Lat'] || '';
                const surveyor = row['Nama Surveyor'] || '';
                const receiver = row['Nama Penerima'] || '';

                // Hanya update jika AppSheet punya data baru (foto/lokasi)
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
            res.json({ success: true, message: `Sinkronisasi Berhasil! ${updateCount} data foto/lokasi diperbarui.` });

        } catch (dbError) {
            await connection.rollback();
            throw dbError;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('[Sync] Fatal Error:', error.message);
        res.status(500).json({ success: false, message: 'Koneksi ke AppSheet gagal: ' + error.message });
    }
});

module.exports = { router, uploadRouter };
