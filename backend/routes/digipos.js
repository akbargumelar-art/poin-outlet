const express = require('express');
const router = express.Router();
const db = require('../db'); // Asumsi koneksi database Anda diekspor dari sini

// GET /api/validate-digipos/:id
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ message: 'ID Digipos diperlukan.' });
    }

    try {
        const [rows] = await db.query(
            'SELECT no_rs, nama_outlet, salesforce, is_registered FROM digipos_data WHERE id_digipos = ?',
            [id]
        );

        if (rows.length === 0) {
            // ID tidak ditemukan di database
            return res.status(404).json({ message: 'ID Digipos tidak ditemukan.' });
        }

        const digiposData = rows[0];

        if (digiposData.is_registered) {
            // ID ditemukan tapi sudah terdaftar
            return res.status(409).json({ message: 'ID Digipos ini sudah terdaftar.' });
        }

        // Sukses, ID valid dan belum terdaftar
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