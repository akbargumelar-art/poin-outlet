
const express = require('express');
const router = express.Router();
const uploadRouter = express.Router();
const db = require('../db');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ==========================================
// 1. BOOTSTRAP (AMBIL SEMUA DATA AWAL)
// ==========================================
router.get('/bootstrap', async (req, res) => {
    try {
        // Gunakan try-catch di setiap query untuk keamanan
        const [users] = await db.execute('SELECT id, role, points, level, kupon_undian, nama, email, phone, tap, salesforce, no_rs, owner, kabupaten, kecamatan, alamat, jabatan, photo_url FROM users').catch(() => [[]]);
        const [transactions] = await db.execute('SELECT * FROM transactions ORDER BY date DESC LIMIT 500').catch(() => [[]]);
        const [loyaltyPrograms] = await db.execute('SELECT * FROM loyalty_programs').catch(() => [[]]);
        const [rewards] = await db.execute('SELECT * FROM rewards ORDER BY display_order ASC, points ASC').catch(() => [[]]);
        const [redemptions] = await db.execute('SELECT * FROM redemptions ORDER BY date DESC').catch(() => [[]]);
        const [runningPrograms] = await db.execute('SELECT * FROM running_programs').catch(() => [[]]);
        const [targets] = await db.execute('SELECT * FROM running_program_targets').catch(() => [[]]);
        const [specialNumbers] = await db.execute('SELECT * FROM special_numbers').catch(() => [[]]);
        const [waSettings] = await db.execute('SELECT * FROM whatsapp_settings LIMIT 1').catch(() => [[null]]);

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

        // Mapping user profile structure
        const formattedUsers = users.map(u => ({
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
                photoUrl: u.photo_url || null
            }
        }));

        res.json({
            success: true,
            users: formattedUsers,
            transactions: transactions.map(t => ({
                id: t.id,
                userId: t.user_id,
                date: t.date,
                produk: t.produk,
                totalPembelian: t.total_pembelian,
                pointsEarned: t.points_earned
            })),
            loyaltyPrograms: loyaltyPrograms.map(p => ({
                level: p.level,
                pointsNeeded: p.pointsNeeded,
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
                pointsSpent: r.points_spent,
                date: r.date,
                status: r.status,
                userName: r.user_name,
                rewardName: r.reward_name,
                documentationPhotoUrl: r.documentation_photo_url,
                locationCoordinates: r.location_coordinates,
                surveyorName: r.surveyor_name
            })),
            runningPrograms: programsWithTargets,
            specialNumbers: specialNumbers.map(n => ({
                id: n.id,
                phoneNumber: n.phone_number,
                price: parseFloat(n.price || 0),
                isSold: n.is_sold === 1
            })),
            whatsAppSettings: waSettings[0] || null
        });

    } catch (error) {
        console.error('Bootstrap Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// ==========================================
// 2. SINKRONISASI DUA ARAH (APPSHEET)
// ==========================================
router.post('/integration/appsheet/sync-all', async (req, res) => {
    try {
        const APPSHEET_APP_ID = process.env.APPSHEET_APP_ID;
        const APPSHEET_ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY;

        if (!APPSHEET_APP_ID || !APPSHEET_ACCESS_KEY) {
            return res.status(400).json({ 
                success: false, 
                message: 'Kredensial API AppSheet (ID/Key) belum terbaca. Pastikan sudah restart PM2 dengan --update-env' 
            });
        }

        // URL API AppSheet (Sesuaikan nama tabel "Tracking Tukar Poin")
        const appsheetUrl = `https://api.appsheet.com/api/v1/apps/${APPSHEET_APP_ID}/tables/Tracking Tukar Poin/Action`;
        
        console.log('Memanggil API AppSheet...');
        
        const response = await axios.post(appsheetUrl, {
            "Action": "Find",
            "Properties": { "Locale": "id-ID" },
            "Rows": []
        }, {
            headers: { 
                "ApplicationAccessKey": APPSHEET_ACCESS_KEY,
                "Content-Type": "application/json"
            },
            timeout: 15000 // 15 detik timeout
        });

        const appsheetRows = response.data;

        // DEBUGGING: Jika respon bukan array, kirim detail respon ke frontend agar bisa dianalisa
        if (!Array.isArray(appsheetRows)) {
            console.error('AppSheet API Error Response:', appsheetRows);
            return res.status(400).json({ 
                success: false, 
                message: `Respon AppSheet Bermasalah. Detail: ${JSON.stringify(appsheetRows)}` 
            });
        }

        let updateCount = 0;
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            for (const row of appsheetRows) {
                const redeemId = row['ID Redeem'];
                if (!redeemId) continue;

                // Cek data di database lokal
                const [localData] = await connection.execute('SELECT id, status, documentation_photo_url FROM redemptions WHERE id = ?', [redeemId]);
                
                if (localData.length > 0) {
                    const local = localData[0];
                    
                    // Kolom dari AppSheet
                    const appsheetPhoto = row['Photo Dokumentasi'] || '';
                    const appsheetLoc = row['Long - Lat'] || '';
                    const appsheetSurveyor = row['Nama Surveyor'] || '';
                    const appsheetReceiver = row['Nama Penerima'] || '';

                    // Jika di AppSheet sudah ada foto ATAU lokasi, dan di Web masih kosong
                    if ((appsheetPhoto !== '' || appsheetLoc !== '') && (local.documentation_photo_url === '' || local.documentation_photo_url === null)) {
                        const updateSql = `
                            UPDATE redemptions SET 
                                status = 'Selesai', 
                                documentation_photo_url = ?, 
                                location_coordinates = ?, 
                                surveyor_name = ?,
                                receiver_name = ?,
                                status_updated_at = NOW()
                            WHERE id = ?
                        `;
                        await connection.execute(updateSql, [appsheetPhoto, appsheetLoc, appsheetSurveyor, appsheetReceiver, redeemId]);
                        updateCount++;
                    }
                }
            }

            await connection.commit();
            res.json({ success: true, message: `Berhasil! ${updateCount} data diperbarui dari AppSheet.` });

        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Sync Fatal Error:', error.message);
        res.status(500).json({ 
            success: false, 
            message: `Gagal terhubung ke AppSheet: ${error.message}` 
        });
    }
});

module.exports = { router, uploadRouter };
