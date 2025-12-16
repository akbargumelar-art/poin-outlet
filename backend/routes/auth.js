
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

// Helper to structure user object from DB row
const structureUserObject = (user) => {
    const userProfile = {
        nama: user.nama,
        email: user.email,
        phone: user.phone,
        owner: user.owner,
        kabupaten: user.kabupaten,
        kecamatan: user.kecamatan,
        salesforce: user.salesforce,
        noRs: user.no_rs,
        alamat: user.alamat,
        tap: user.tap,
        jabatan: user.jabatan,
        photoUrl: user.photo_url // Mapped from photo_url
    };
    
    return {
        id: user.id,
        role: user.role,
        points: user.points,
        level: user.level,
        kuponUndian: user.kupon_undian,
        profile: userProfile
    };
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { id, password } = req.body;

    if (!id || !password) {
        return res.status(400).json({ message: 'ID dan password dibutuhkan.' });
    }

    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'ID atau password salah.' });
        }

        const user = rows[0];
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        
        if (isPasswordMatch) {
            // Successful login
            res.json(structureUserObject(user));
        } else {
            // STRICT SECURITY: Removed self-healing logic.
            // If password doesn't match, simply fail.
            return res.status(401).json({ message: 'ID atau password salah.' });
        }

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// PUT /api/auth/change-password
router.put('/change-password', async (req, res) => {
    const { id, oldPassword, newPassword } = req.body;

    if (!id || !oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Data tidak lengkap.' });
    }

    try {
        // 1. Get current password hash
        const [rows] = await db.execute('SELECT password FROM users WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'User tidak ditemukan.' });

        const user = rows[0];
        
        // 2. Verify Old Password
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Password lama salah.' });
        }

        // 3. Hash New Password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        
        // 4. Update
        const [result] = await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, id]);

        if (result.affectedRows > 0) {
            res.json({ message: 'Password berhasil diubah.' });
        } else {
            res.status(500).json({ message: 'Gagal mengupdate database.' });
        }
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Gagal mengubah password.' });
    }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { idDigipos, namaOutlet, noRs, kabupaten, kecamatan, namaOwner, noWhatsapp, salesforce, password } = req.body;
    
    // Basic validation for presence
    const requiredFields = { idDigipos, namaOutlet, noRs, kabupaten, kecamatan, namaOwner, noWhatsapp, salesforce, password };
    for (const [key, value] of Object.entries(requiredFields)) {
        if (!value || String(value).trim() === '') {
            return res.status(400).json({ message: `Kolom ${key} wajib diisi.` });
        }
    }
    
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password harus minimal 6 karakter.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Check master data
        const [digiposRows] = await connection.execute('SELECT tap FROM digipos_data WHERE id_digipos = ?', [idDigipos]);
        if (digiposRows.length === 0) {
            throw new Error('ID Digipos belum terdaftar sebagai Mitra Telkomsel');
        }
        const tap = digiposRows[0].tap || 'UNKNOWN';

        // 2. Check if user already exists
        const [existingUser] = await connection.execute('SELECT id FROM users WHERE id = ?', [idDigipos]);
        if (existingUser.length > 0) {
            throw new Error('ID Digipos sudah terdaftar di sistem.');
        }

        // 3. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Insert
        const sql = `
            INSERT INTO users 
            (id, password, role, nama, owner, phone, kabupaten, kecamatan, salesforce, no_rs, tap, level, points, kupon_undian)
            VALUES (?, ?, 'pelanggan', ?, ?, ?, ?, ?, ?, ?, ?, 'Bronze', 0, 0)
        `;
        
        await connection.execute(sql, [idDigipos, hashedPassword, namaOutlet, namaOwner, noWhatsapp, kabupaten, kecamatan, salesforce, noRs, tap]);

        await connection.commit();
        
        // Return new user
        const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [idDigipos]);
        res.status(201).json(structureUserObject(rows[0]));

    } catch (error) {
        await connection.rollback();
        console.error('Registration error:', error);
        res.status(400).json({ message: error.message || 'Registrasi gagal, terjadi kesalahan pada server.' });
    } finally {
        connection.release();
    }
});

module.exports = router;
