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
            // Normal successful login
            res.json(structureUserObject(user));
        } else {
            // Self-healing check for any user with the default password 'password'.
            // This is useful for initial setup or password resets to a default.
            if (password === 'password') {
                console.log(`Login failed for user '${id}' with stored hash. Attempting to self-heal default password...`);
                const newHashedPassword = await bcrypt.hash('password', 10);
                await db.execute('UPDATE users SET password = ? WHERE id = ?', [newHashedPassword, id]);
                console.log(`Password hash for user '${id}' has been updated. Allowing login.`);
                
                // Fetch the updated user data to send back
                const [updatedRows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
                res.json(structureUserObject(updatedRows[0]));
                return; // Important to return here
            }

            // If the password is not 'password', it's a genuine failed login
            return res.status(401).json({ message: 'ID atau password salah.' });
        }

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
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

        // 1. **NEW VALIDATION**: Check if the ID Digipos exists in the master data table first.
        const [digiposRows] = await connection.execute('SELECT tap FROM digipos_data WHERE id_digipos = ?', [idDigipos]);
        if (digiposRows.length === 0) {
            // Specific error message as requested by the user.
            throw new Error('ID Digipos belum terdaftar sebagai Mitra Telkomsel');
        }
        const tap = digiposRows[0].tap || 'UNKNOWN'; // Get TAP from master data

        // 2. Check if user already exists in `users` table
        const [existingUser] = await connection.execute('SELECT id FROM users WHERE id = ?', [idDigipos]);
        if (existingUser.length > 0) {
            throw new Error('ID Digipos sudah terdaftar di sistem.');
        }

        // 3. Hash the user-provided password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Insert new user into `users` table
        const sql = `
            INSERT INTO users 
            (id, password, role, nama, owner, phone, kabupaten, kecamatan, salesforce, no_rs, tap, level, points, kupon_undian)
            VALUES (?, ?, 'pelanggan', ?, ?, ?, ?, ?, ?, ?, ?, 'Bronze', 0, 0)
        `;
        
        await connection.execute(sql, [idDigipos, hashedPassword, namaOutlet, namaOwner, noWhatsapp, kabupaten, kecamatan, salesforce, noRs, tap]);

        await connection.commit();
        
        // Fetch and return the newly created user for immediate login
        const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [idDigipos]);
        res.status(201).json(structureUserObject(rows[0]));

    } catch (error) {
        await connection.rollback();
        console.error('Registration error:', error);
        // Send a more specific error message back to the client
        res.status(400).json({ message: error.message || 'Registrasi gagal, terjadi kesalahan pada server.' });
    } finally {
        connection.release();
    }
});


module.exports = router;
