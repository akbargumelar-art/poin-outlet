
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { id, password } = req.body;

    if (!id || !password) {
        return res.status(400).json({ message: 'ID dan password dibutuhkan.' });
    }

    try {
        // Fetch user from the database
        // The query now joins with a hypothetical 'profiles' table or reconstructs the profile object.
        // For simplicity, we are selecting all columns and will structure them.
        const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'ID tidak ditemukan.' });
        }

        const user = rows[0];

        // IMPORTANT: Compare the provided password with the hashed password in the database
        // The password in your DB MUST be hashed. If it's plain text, this will always fail.
        // To generate a hash for testing: `bcrypt.hashSync('password', 10)`
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        
        if (!isPasswordMatch) {
            // For production, it's better to use a generic error message like "Invalid credentials"
            // to avoid revealing which part (ID or password) was wrong.
            return res.status(401).json({ message: 'Password salah.' });
        }

        // Structure the user object to match the frontend's expectation
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
            photo: user.photo_url
        };
        
        // Don't send the password hash back to the client
        const userToSend = {
            id: user.id,
            role: user.role,
            points: user.points,
            level: user.level,
            kuponUndian: user.kupon_undian,
            profile: userProfile
        };

        res.json(userToSend);

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

module.exports = router;
