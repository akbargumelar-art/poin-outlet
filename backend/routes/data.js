
const express = require('express');
const router = express.Router();
const uploadRouter = express.Router();
const db = require('../db');
const axios = require('axios');

// ============================================================
// INTEGRASI APPSHEET: SINKRONISASI DUA ARAH (PULL FROM APPSHEET)
// ============================================================
router.post('/integration/appsheet/sync-all', async (req, res) => {
    try {
        const APPSHEET_APP_ID = process.env.APPSHEET_APP_ID;
        const APPSHEET_ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY;

        if (!APPSHEET_APP_ID || !APPSHEET_ACCESS_KEY) {
            return res.status(400).json({ 
                success: false, 
                message: 'Kredensial AppSheet belum terbaca di server. Pastikan sudah restart PM2 dengan --update-env' 
            });
        }

        // Ambil data terbaru dari AppSheet (Table: Tracking Tukar Poin)
        const appsheetUrl = `https://api.appsheet.com/api/v1/apps/${APPSHEET_APP_ID}/tables/Tracking Tukar Poin/Action`;
        
        console.log('Memulai penarikan data dari AppSheet...');
        const response = await axios.post(appsheetUrl, {
            "Action": "Find",
            "Properties": { "Locale": "id-ID" },
            "Rows": []
        }, {
            headers: { "ApplicationAccessKey": APPSHEET_ACCESS_KEY }
        });

        const appsheetRows = response.data;
        if (!Array.isArray(appsheetRows)) {
            throw new Error("Gagal mengambil data: Respon API AppSheet bukan array.");
        }

        let updateCount = 0;
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            for (const row of appsheetRows) {
                const redeemId = row['ID Redeem'];
                if (!redeemId) continue;

                // Cek data lokal di database web
                const [localData] = await connection.execute('SELECT * FROM redemptions WHERE id = ?', [redeemId]);
                
                if (localData.length > 0) {
                    const local = localData[0];
                    
                    // Bandingkan field penting. Jika di AppSheet sudah diisi (tidak kosong) 
                    // dan berbeda dengan Web, maka update Web.
                    const appsheetPhoto = row['Photo Dokumentasi'] || '';
                    const appsheetLocation = row['Long - Lat'] || '';
                    const appsheetReceiver = row['Nama Penerima'] || '';
                    const appsheetSurveyor = row['Nama Surveyor'] || '';

                    const needsUpdate = 
                        (appsheetPhoto !== '' && appsheetPhoto !== local.documentation_photo_url) ||
                        (appsheetLocation !== '' && appsheetLocation !== local.location_coordinates) ||
                        (appsheetReceiver !== '' && appsheetReceiver !== local.receiver_name) ||
                        (appsheetSurveyor !== '' && appsheetSurveyor !== local.surveyor_name);

                    if (needsUpdate) {
                        const updateSql = `
                            UPDATE redemptions SET 
                                status = 'Selesai', 
                                documentation_photo_url = ?, 
                                location_coordinates = ?,
                                receiver_name = ?,
                                receiver_role = ?,
                                surveyor_name = ?,
                                status_updated_at = NOW()
                            WHERE id = ?
                        `;
                        await connection.execute(updateSql, [
                            appsheetPhoto,
                            appsheetLocation,
                            appsheetReceiver,
                            row['Penerima Hadiah'] || 'Frontliner',
                            appsheetSurveyor,
                            redeemId
                        ]);
                        updateCount++;
                    }
                }
            }

            await connection.commit();
            res.json({ 
                success: true, 
                message: `Sinkronisasi Berhasil! ${updateCount} data diperbarui sesuai kondisi terbaru di AppSheet.` 
            });

        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Sync Error:', error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal sinkronisasi: ' + error.message 
        });
    }
});

// Endpoint bootstrap dan lainnya tetap di bawah...
router.get('/bootstrap', async (req, res) => {
    // ... existing bootstrap code
    res.json({ /* data */ });
});

module.exports = { router, uploadRouter };
