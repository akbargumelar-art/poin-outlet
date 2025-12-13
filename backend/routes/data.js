
// ==========================================
// INTEGRATION ROUTER (AppSheet / External)
// ==========================================

// Endpoint for AppSheet Automation/Webhooks to update redemption status
// Expects JSON: { id: number, note: string, photo_base64: string, receiver_name: string, receiver_role: string, surveyor_name: string, location: string }
// Status is optional here, defaults to 'Selesai' implies successful delivery/pickup via AppSheet
router.post('/integration/redemption/update', async (req, res) => {
    const { 
        id, 
        note, 
        photo_base64, 
        receiver_name, 
        receiver_role, 
        surveyor_name, 
        location 
    } = req.body;

    // Auto-set status to 'Selesai' if not provided by AppSheet
    const status = req.body.status || 'Selesai';

    if (!id) {
        return res.status(400).json({ message: 'ID is required' });
    }

    const connection = await db.getConnection();
    try {
        // 1. Handle Photo Upload if Base64 is provided
        let photoUrl = null;
        if (photo_base64) {
            // Remove header if present (e.g., "data:image/jpeg;base64,")
            const base64Data = photo_base64.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            
            const filename = `appsheet-doc-${Date.now()}-${id}.jpg`;
            const uploadPath = path.join(__dirname, '../uploads');
            
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            
            const filePath = path.join(uploadPath, filename);
            fs.writeFileSync(filePath, buffer);
            
            photoUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
        }

        // 2. Update Database with new fields
        let query = `
            UPDATE redemptions SET 
            status = ?, 
            status_note = ?, 
            status_updated_at = NOW(),
            receiver_name = ?,
            receiver_role = ?,
            surveyor_name = ?,
            location_coordinates = ?
        `;
        
        const params = [
            status, 
            note || null,
            receiver_name || null,
            receiver_role || null,
            surveyor_name || null,
            location || null
        ];

        if (photoUrl) {
            query += ', documentation_photo_url = ?';
            params.push(photoUrl);
        }

        query += ' WHERE id = ?';
        params.push(id);

        const [result] = await connection.execute(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Redemption ID not found' });
        }

        res.json({ 
            message: 'Status updated successfully', 
            id, 
            status, 
            photo_url: photoUrl 
        });

    } catch (error) {
        console.error('Integration Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    } finally {
        connection.release();
    }
});
