const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/validate-digipos/:id
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ message: 'ID Digipos diperlukan.' });
    }

    try {
        // 1. Check if the ID exists in the master data table (`digipos_data`)
        const [digiposRows] = await db.query(
            'SELECT no_rs, nama_outlet, salesforce FROM digipos_data WHERE id_digipos = ?',
            [id]
        );

        if (digiposRows.length === 0) {
            // ID not found in the master data, so it's not a valid partner ID
            return res.status(404).json({ message: 'ID Digipos tidak ditemukan di data master.' });
        }
        
        // 2. If it exists in master data, check if it's already registered in the `users` table
        const [userRows] = await db.query(
            'SELECT id FROM users WHERE id = ?',
            [id]
        );
        
        if (userRows.length > 0) {
            // ID is valid but has already been registered
            return res.status(409).json({ message: 'ID Digipos ini sudah terdaftar.' });
        }

        // 3. Success: ID is valid and not yet registered
        const digiposData = digiposRows[0];
        res.status(200).json({
            noRs: digiposData.no_rs,
            namaOutlet: digiposData.nama_outlet,
            salesforce: digiposData.salesforce
        });

    } catch (error) {
        console.error('Error validating Digipos ID:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

module.exports = router;
