
import React, { useState } from 'react';
import { User } from '../../types';

interface ManajemenPoinProps {
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const ManajemenPoin: React.FC<ManajemenPoinProps> = ({ users, setUsers }) => {
    const [selectedUserId, setSelectedUserId] = useState('');
    const [points, setPoints] = useState(0);
    const [action, setAction] = useState<'tambah' | 'kurang'>('tambah');

    const handleUpdatePoin = () => {
        if (!selectedUserId || points === 0) return;
        setUsers(users.map(u => {
            if (u.id === selectedUserId) {
                const currentPoints = u.points || 0;
                const newPoints = action === 'tambah' ? currentPoints + points : currentPoints - points;
                return { ...u, points: newPoints < 0 ? 0 : newPoints };
            }
            return u;
        }));
        setPoints(0);
        setSelectedUserId('');
    };
    
    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-700 mb-6">Manajemen Poin Mitra Outlet</h1>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Manual Point Adjustment */}
                <div className="neu-card p-8">
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Update Poin Manual</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-gray-600 text-sm font-semibold mb-2">Pilih Mitra Outlet</label>
                            <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="input-field">
                                <option value="">-- Pilih Mitra --</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.profile.nama} ({u.id})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-600 text-sm font-semibold mb-2">Jumlah Poin</label>
                            <input type="number" value={points} onChange={e => setPoints(parseInt(e.target.value, 10))} className="input-field" />
                        </div>
                         <div>
                            <label className="block text-gray-600 text-sm font-semibold mb-2">Aksi</label>
                            <div className="flex gap-4">
                               <button onClick={() => setAction('tambah')} className={`flex-1 neu-button ${action === 'tambah' ? 'text-green-600 neu-inset' : ''}`}>Tambah</button>
                               <button onClick={() => setAction('kurang')} className={`flex-1 neu-button ${action === 'kurang' ? 'text-red-600 neu-inset' : ''}`}>Kurang</button>
                            </div>
                        </div>
                        <button onClick={handleUpdatePoin} className="neu-button text-red-600 w-full">Update Poin</button>
                    </div>
                </div>

                {/* Point Calculation Rules */}
                <div className="neu-card p-8">
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Aturan Perhitungan Poin</h2>
                     <p className="text-center text-gray-500 p-4">Fitur untuk mengatur perhitungan poin berdasarkan level loyalitas akan tersedia di sini.</p>
                </div>
             </div>
        </div>
    );
};

export default ManajemenPoin;