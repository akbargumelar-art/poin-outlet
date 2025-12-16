
// ** NEW: SERVER-SIDE AUDIT ENDPOINT **
router.get('/users/:id/audit', async (req, res) => {
    try {
        const { id } = req.params;
        // Fetch total earned points from all history (not limited)
        const [earnedRows] = await db.execute('SELECT SUM(points_earned) as total FROM transactions WHERE user_id=?', [id]);
        // Fetch total spent points from redemptions
        const [spentRows] = await db.execute('SELECT SUM(points_spent) as total FROM redemptions WHERE user_id=? AND status != "Ditolak"', [id]);
        // Fetch current actual points
        const [userRows] = await db.execute('SELECT points FROM users WHERE id=?', [id]);

        const earned = earnedRows[0].total ? parseInt(earnedRows[0].total) : 0;
        const spent = spentRows[0].total ? parseInt(spentRows[0].total) : 0;
        const actual = userRows[0] ? userRows[0].points : 0;
        const calculated = earned - spent;

        res.json({
            userId: id,
            earned,
            spent,
            calculated,
            actual,
            discrepancy: actual - calculated,
            isSync: actual === calculated
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ** NEW: SINGLE USER SMART AUDIT & FIX **
router.post('/audit/fix/:id', async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 0. Get WhatsApp Settings
        const [settingsRows] = await connection.execute('SELECT * FROM whatsapp_settings LIMIT 1');
        const waSettings = settingsRows[0];

        // 1. Calculate Total Earned
        const [earnedRows] = await connection.execute(
            'SELECT SUM(points_earned) as total FROM transactions WHERE user_id=?', 
            [id]
        );
        const totalEarned = earnedRows[0].total ? parseInt(earnedRows[0].total) : 0;

        // 2. Calculate Points Spent on COMPLETED/APPROVED redemptions only (Fixed Cost)
        const [spentFinishedRows] = await connection.execute(
            'SELECT SUM(points_spent) as total FROM redemptions WHERE user_id=? AND status = "Selesai"', 
            [id]
        );
        const spentFinished = spentFinishedRows[0].total ? parseInt(spentFinishedRows[0].total) : 0;

        // 3. Calculate Available "Real" Points before pending requests
        let availablePoints = totalEarned - spentFinished;
        let cancelledCount = 0;

        // 4. Fetch Pending Redemptions
        const [pendingRedemptions] = await connection.execute(
            `SELECT r.id, r.points_spent, r.reward_name, u.phone, u.nama 
             FROM redemptions r 
             JOIN users u ON r.user_id = u.id 
             WHERE r.user_id=? AND r.status IN ("Diajukan", "Diproses") 
             ORDER BY r.date ASC`,
            [id]
        );

        // 5. Validate Pending Redemptions
        for (const redemption of pendingRedemptions) {
            if (availablePoints >= redemption.points_spent) {
                availablePoints -= redemption.points_spent;
            } else {
                // Cancel redemption
                await connection.execute(
                    'UPDATE redemptions SET status="Ditolak", status_note=?, status_updated_at=NOW() WHERE id=?',
                    ['Audit Sistem: Dibatalkan otomatis karena poin transaksi tidak mencukupi (Kelebihan Poin).', redemption.id]
                );
                
                // Return stock
                await connection.execute(
                    'UPDATE rewards r JOIN redemptions rd ON r.id = rd.reward_id SET r.stock = r.stock + 1 WHERE rd.id = ?',
                    [redemption.id]
                );

                cancelledCount++;

                // Send WA
                if (waSettings && waSettings.webhook_url && waSettings.api_key && redemption.phone) {
                    const chatId = formatPhoneForWA(redemption.phone);
                    const message = `Halo ${redemption.nama},\n\nMohon maaf, penukaran poin Anda untuk hadiah *${redemption.reward_name}* telah kami batalkan otomatis oleh sistem.\n\n*Alasan:* Hasil audit sistem menunjukkan saldo poin dari riwayat transaksi Anda tidak mencukupi untuk penukaran ini.\n\nSaldo poin Anda telah disesuaikan dengan riwayat transaksi yang valid.\n\nTerima kasih.`;
                    
                    axios.post(`${waSettings.webhook_url}/api/sendText`, {
                        chatId: chatId,
                        text: message,
                        session: waSettings.session_name || 'default'
                    }, {
                        headers: { 'X-Api-Key': waSettings.api_key }
                    }).catch(err => console.error(`Failed to send WA to ${redemption.phone}:`, err.message));
                }
            }
        }

        // 6. Update User Balance
        await connection.execute('UPDATE users SET points=? WHERE id=?', [availablePoints, id]);

        await connection.commit();
        res.json({ 
            success: true, 
            message: `Poin berhasil diperbaiki. Saldo sekarang: ${availablePoints}. Penukaran dibatalkan: ${cancelledCount}.`,
            newPoints: availablePoints
        });

    } catch (err) {
        await connection.rollback();
        console.error("Single Audit Error:", err);
        res.status(500).json({ message: 'Terjadi kesalahan saat memperbaiki poin.' });
    } finally {
        connection.release();
    }
});

// ** NEW: ADVANCED BULK AUDIT & FIX WITH WHATSAPP NOTIFICATION **
router.post('/audit/bulk-fix', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 0. Get WhatsApp Settings
        const [settingsRows] = await connection.execute('SELECT * FROM whatsapp_settings LIMIT 1');
        const waSettings = settingsRows[0];

        // 1. Get all customers
        const [users] = await connection.execute("SELECT id FROM users WHERE role = 'pelanggan'");
        
        let updatedUsersCount = 0;
        let cancelledRedemptionsCount = 0;

        for (const user of users) {
            const userId = user.id;

            // 2. Calculate Total Earned (All time)
            const [earnedRows] = await connection.execute(
                'SELECT SUM(points_earned) as total FROM transactions WHERE user_id=?', 
                [userId]
            );
            const totalEarned = earnedRows[0].total ? parseInt(earnedRows[0].total) : 0;

            // 3. Calculate Points Spent on COMPLETED/APPROVED redemptions only (Fixed Cost)
            const [spentFinishedRows] = await connection.execute(
                'SELECT SUM(points_spent) as total FROM redemptions WHERE user_id=? AND status = "Selesai"', 
                [userId]
            );
            const spentFinished = spentFinishedRows[0].total ? parseInt(spentFinishedRows[0].total) : 0;

            // 4. Calculate Available "Real" Points before pending requests
            let availablePoints = totalEarned - spentFinished;

            // 5. Fetch Pending Redemptions (Diajukan/Diproses) WITH user contact info
            const [pendingRedemptions] = await connection.execute(
                `SELECT r.id, r.points_spent, r.reward_name, u.phone, u.nama 
                 FROM redemptions r 
                 JOIN users u ON r.user_id = u.id 
                 WHERE r.user_id=? AND r.status IN ("Diajukan", "Diproses") 
                 ORDER BY r.date ASC`,
                [userId]
            );

            // 6. Validate Pending Redemptions
            for (const redemption of pendingRedemptions) {
                if (availablePoints >= redemption.points_spent) {
                    // Valid: User has enough points. Deduct from available.
                    availablePoints -= redemption.points_spent;
                } else {
                    // INVALID: User doesn't have enough points based on history.
                    // Action: Cancel this redemption automatically.
                    await connection.execute(
                        'UPDATE redemptions SET status="Ditolak", status_note=?, status_updated_at=NOW() WHERE id=?',
                        ['Audit Sistem: Dibatalkan otomatis karena poin transaksi tidak mencukupi (Kelebihan Poin).', redemption.id]
                    );
                    
                    // Return stock
                    await connection.execute(
                        'UPDATE rewards r JOIN redemptions rd ON r.id = rd.reward_id SET r.stock = r.stock + 1 WHERE rd.id = ?',
                        [redemption.id]
                    );

                    cancelledRedemptionsCount++;

                    // --- SEND WHATSAPP NOTIFICATION ---
                    if (waSettings && waSettings.webhook_url && waSettings.api_key && redemption.phone) {
                        const chatId = formatPhoneForWA(redemption.phone);
                        const message = `Halo ${redemption.nama},\n\nMohon maaf, penukaran poin Anda untuk hadiah *${redemption.reward_name}* telah kami batalkan otomatis oleh sistem.\n\n*Alasan:* Hasil audit sistem menunjukkan saldo poin dari riwayat transaksi Anda tidak mencukupi untuk penukaran ini.\n\nSaldo poin Anda telah disesuaikan dengan riwayat transaksi yang valid.\n\nTerima kasih.`;
                        
                        // Send async, don't await to avoid blocking DB transaction on network
                        axios.post(`${waSettings.webhook_url}/api/sendText`, {
                            chatId: chatId,
                            text: message,
                            session: waSettings.session_name || 'default'
                        }, {
                            headers: { 'X-Api-Key': waSettings.api_key }
                        }).catch(err => console.error(`Failed to send WA to ${redemption.phone}:`, err.message));
                    }
                }
            }

            // 7. Final Balance Sync
            const [currentUser] = await connection.execute('SELECT points FROM users WHERE id=?', [userId]);
            const currentDbPoints = currentUser[0].points;

            if (currentDbPoints !== availablePoints) {
                await connection.execute('UPDATE users SET points=? WHERE id=?', [availablePoints, userId]);
                updatedUsersCount++;
            }
        }

        await connection.commit();
        res.json({ 
            success: true, 
            message: `Audit Selesai. ${updatedUsersCount} user disinkronisasi, ${cancelledRedemptionsCount} penukaran dibatalkan & dinotifikasi.` 
        });

    } catch (err) {
        await connection.rollback();
        console.error("Bulk Audit Error:", err);
        res.status(500).json({ message: 'Terjadi kesalahan saat proses audit massal.' });
    } finally {
        connection.release();
    }
});
