
const express = require('express');
const db = require('../db');

const router = express.Router();

// This helper function executes a query safely.
// If a table doesn't exist, it returns an empty array instead of crashing.
const safeQueryDB = async (query, params = []) => {
    try {
        const [rows] = await db.execute(query, params);
        return rows;
    } catch (error) {
        // MySQL error code for "Table doesn't exist"
        if (error.code === 'ER_NO_SUCH_TABLE') {
            console.warn(`Warning: Table for query "${query}" not found. Returning empty array.`);
            return []; // Gracefully return empty array if table is missing
        }
        // For other errors, log and re-throw to trigger a 500 response
        console.error(`Database query failed: ${query}`, error);
        throw error;
    }
};


// GET /api/bootstrap
// An efficient endpoint to fetch all necessary initial data for the app.
router.get('/bootstrap', async (req, res) => {
    try {
        // Run all queries in parallel for better performance, using the safe helper
        const [
            users, 
            transactions, 
            rewards, 
            redemptionHistory, 
            loyaltyPrograms, 
            runningPrograms,
            rafflePrograms,
            couponRedemptions,
            raffleWinners
        ] = await Promise.all([
            safeQueryDB('SELECT * FROM users'),
            safeQueryDB('SELECT * FROM transactions'),
            safeQueryDB('SELECT * FROM rewards'),
            safeQueryDB('SELECT * FROM redemptions'),
            safeQueryDB('SELECT * FROM loyalty_programs'),
            safeQueryDB('SELECT * FROM running_programs'),
            safeQueryDB('SELECT * FROM raffle_programs'),
            safeQueryDB('SELECT * FROM coupon_redemptions'),
            safeQueryDB('SELECT * FROM raffle_winners'),
        ]);

        // Re-structure users to match frontend's nested profile object expectation
        const structuredUsers = users.map(user => {
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
            // Return a new object without the flat profile properties and the password hash
            return {
                id: user.id,
                role: user.role,
                points: user.points,
                level: user.level,
                kuponUndian: user.kupon_undian,
                profile: userProfile
            };
        });
        
        // Prepare the payload with all data (some arrays may be empty if tables are missing)
        const bootstrapData = {
            users: structuredUsers,
            transactions,
            rewards,
            redemptionHistory,
            loyaltyPrograms,
            runningPrograms,
            rafflePrograms,
            couponRedemptions,
            raffleWinners
        };

        res.json(bootstrapData);

    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil data aplikasi.', error: error.message });
    }
});

module.exports = router;
