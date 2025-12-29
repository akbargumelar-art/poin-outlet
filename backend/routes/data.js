
const express = require('express');
const router = express.Router();
const uploadRouter = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// ==========================================
// PROACTIVE TWO-WAY SYNC (WEB CHECKS APPSHEET)
// ==========================================
router.post('/integration/appsheet/sync-all', async (req, res) => {
    try {
        // 1. Ambil Pengaturan API AppSheet dari Database
        const [settingsRows] = await db.execute('SELECT * FROM whatsapp_settings LIMIT 1');
        const settings = settingsRows[0];
        
        // Kita asumsikan API Key AppSheet disimpan di kolom tertentu atau env
        // Untuk demo, kita gunakan format standar API AppSheet
        const APPSHEET_APP_ID = process.env.APPSHEET_APP_ID; 
        const APPSHEET_ACCESS_KEY = process.env.APPSHEET_ACCESS_KEY;

        if (!APPSHEET_APP_ID || !APPSHEET_ACCESS_KEY) {
            return res.status(400).json({ success: false, message: 'API Key AppSheet belum diatur di server (ENV).' });
        }

        // 2. Panggil API AppSheet (Action: Find)
        const appsheetUrl = `https://api.appsheet.com/api/v1/apps/${APPSHEET_APP_ID}/tables/Tracking Tukar Poin/Action`;
        
        const response = await axios.post(appsheetUrl, {
            "Action": "Find",
            "Properties": { "Locale": "id-ID" },
            "Rows": []
        }, {
            headers: { "ApplicationAccessKey": APPSHEET_ACCESS_KEY }
        });

        const appsheetRows = response.data;
        if (!Array.isArray(appsheetRows)) {
            throw new Error("Format data dari AppSheet tidak valid.");
        }

        let updateCount = 0;
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            for (const row of appsheetRows) {
                const redeemId = row['ID Redeem'];
                if (!redeemId) continue;

                // Ambil data lokal untuk dibandingkan
                const [localData] = await connection.execute('SELECT * FROM redemptions WHERE id = ?', [redeemId]);
                
                if (localData.length > 0) {
                    const local = localData[0];
                    
                    // CEK PERBEDAAN: Jika status berbeda atau foto baru diisi di AppSheet
                    const hasDifference = 
                        (row['Status'] && row['Status'] !== local.status) ||
                        (row['Nama Surveyor'] && row['Nama Surveyor'] !== local.surveyor_name) ||
                        (row['Photo Dokumentasi'] && row['Photo Dokumentasi'] !== local.documentation_photo_url) ||
                        (row['Long - Lat'] && row['Long - Lat'] !== local.location_coordinates);

                    if (hasDifference) {
                        const updateSql = `
                            UPDATE redemptions SET 
                                status = ?, 
                                surveyor_name = ?, 
                                documentation_photo_url = ?, 
                                location_coordinates = ?,
                                receiver_name = ?,
                                receiver_role = ?,
                                status_updated_at = NOW()
                            WHERE id = ?
                        `;
                        await connection.execute(updateSql, [
                            row['Status'] || local.status,
                            row['Nama Surveyor'] || local.surveyor_name,
                            row['Photo Dokumentasi'] || local.documentation_photo_url,
                            row['Long - Lat'] || local.location_coordinates,
                            row['Nama Penerima'] || local.receiver_name,
                            row['Penerima Hadiah'] || local.receiver_role,
                            redeemId
                        ]);
                        updateCount++;
                    }
                }
            }

            await connection.commit();
            res.json({ success: true, message: `Sinkronisasi selesai. ${updateCount} data diperbarui otomatis.` });

        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Proactive Sync Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- Endpoint sinkronisasi satu arah (webhook) tetap ada untuk kecepatan ---
router.post('/integration/redemption/update', async (req, res) => {
    // ... (kode webhook sebelumnya)
});

// Bootstrap & Other routes...
router.get('/bootstrap', async (req, res) => {
    // ... existing bootstrap code
});

module.exports = { router, uploadRouter };
