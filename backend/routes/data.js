
// ... existing code ...

router.patch('/redemptions/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, statusNote } = req.body;

    if (!status) {
        return res.status(400).json({ message: "Status is required." });
    }

    try {
        const sql = 'UPDATE redemptions SET status = ?, status_note = ?, status_updated_at = NOW() WHERE id = ?';
        const [result] = await db.execute(sql, [status, statusNote || null, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Redemption record not found.' });
        }

        res.json({ message: 'Redemption status updated successfully.' });

    } catch (error) {
        console.error('Update redemption status error:', error);
        res.status(500).json({ message: 'Failed to update redemption status.' });
    }
});

// BULK UPDATE REDEMPTION STATUS
router.post('/redemptions/bulk/status', async (req, res) => {
    const { ids, status, statusNote } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Daftar ID tidak valid." });
    }
    if (!status) {
        return res.status(400).json({ message: "Status baru diperlukan." });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Dynamically build placeholders like (?, ?, ?)
        const placeholders = ids.map(() => '?').join(', ');
        const sql = `UPDATE redemptions SET status = ?, status_note = ?, status_updated_at = NOW() WHERE id IN (${placeholders})`;
        
        // Combine params: status, note, ...ids
        const params = [status, statusNote || null, ...ids];

        const [result] = await connection.execute(sql, params);

        await connection.commit();
        res.json({ message: `Berhasil mengupdate ${result.affectedRows} data penukaran.` });

    } catch (error) {
        await connection.rollback();
        console.error('Bulk update redemption status error:', error);
        res.status(500).json({ message: 'Gagal melakukan update massal.' });
    } finally {
        connection.release();
    }
});


// REWARD MANAGEMENT
router.post('/rewards', async (req, res) => {
// ... existing code ...
