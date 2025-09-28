import React, { useState, useEffect } from 'react';
import { User, LoyaltyProgram, Transaction } from '../../types';
import Modal from '../../components/common/Modal';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';

// --- Loyalty Level Form Component ---
interface LevelFormProps {
    level: LoyaltyProgram;
    onSave: (level: LoyaltyProgram) => void;
    onCancel: () => void;
}

const LevelForm: React.FC<LevelFormProps> = ({ level, onSave, onCancel }) => {
    const [formData, setFormData] = useState(level);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'pointsNeeded' || name === 'multiplier' ? parseFloat(value) : value }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-gray-600 text-sm font-semibold mb-1">Level</label>
                <input value={formData.level} className="input-field-disabled" readOnly />
            </div>
            <div>
                <label className="block text-gray-600 text-sm font-semibold mb-1">Poin Dibutuhkan</label>
                <input type="number" name="pointsNeeded" value={formData.pointsNeeded} onChange={handleChange} className="input-field" required />
            </div>
            <div>
                <label className="block text-gray-600 text-sm font-semibold mb-1">Pengali Poin (e.g., 1.2 untuk 1.2x)</label>
                <input type="number" step="0.1" name="multiplier" value={formData.multiplier} onChange={handleChange} className="input-field" required />
            </div>
            <div>
                <label className="block text-gray-600 text-sm font-semibold mb-1">Deskripsi Keuntungan</label>
                <textarea name="benefit" value={formData.benefit} onChange={handleChange} className="input-field" required />
            </div>
             <div className="flex gap-4 pt-4">
                <button type="button" onClick={onCancel} className="neu-button">Batal</button>
                <button type="submit" className="neu-button text-red-600">Simpan Perubahan</button>
            </div>
        </form>
    );
};


// --- Main Component ---
interface ManajemenPoinProps {
    users: User[];
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    loyaltyPrograms: LoyaltyProgram[];
    updateLoyaltyProgram: (program: LoyaltyProgram) => void;
    adminAddTransaction: (data: Omit<Transaction, 'id' | 'points'>) => void;
    adminBulkAddTransactions: (data: Omit<Transaction, 'id' | 'points' | 'totalPembelian'>[]) => void;
    isReadOnly?: boolean;
}

const ManajemenPoin: React.FC<ManajemenPoinProps> = ({ users, setUsers, loyaltyPrograms, updateLoyaltyProgram, adminAddTransaction, adminBulkAddTransactions, isReadOnly }) => {
    const [manualUserId, setManualUserId] = useState('');
    const [manualPoints, setManualPoints] = useState(0);
    const [manualAction, setManualAction] = useState<'tambah' | 'kurang'>('tambah');
    const [editingLevel, setEditingLevel] = useState<LoyaltyProgram | null>(null);
    const [txData, setTxData] = useState({ userId: '', produk: '', harga: 0, kuantiti: 0, date: new Date().toISOString().split('T')[0]});
    const [showUploadModal, setShowUploadModal] = useState(false);

    const selectedUser = users.find(u => u.id === txData.userId);
    const loyaltyLevel = loyaltyPrograms.find(p => p.level === selectedUser?.level);
    const multiplier = loyaltyLevel ? loyaltyLevel.multiplier : 1;
    const totalPembelian = txData.harga * txData.kuantiti;
    const potentialPoints = selectedUser ? Math.floor((totalPembelian / 1000) * multiplier) : 0;
    
    const selectedManualUser = users.find(u => u.id === manualUserId);

    const handleTxChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const {name, value, type} = e.target;
        setTxData(prev => ({...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value}));
    }

    const handleTxSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!txData.userId || totalPembelian <= 0) return;
        adminAddTransaction({ ...txData, totalPembelian });
        setTxData({ userId: '', produk: '', harga: 0, kuantiti: 0, date: new Date().toISOString().split('T')[0]});
    }

    const handleUpdatePoin = () => {
        if (!manualUserId || manualPoints <= 0) return;
        setUsers(currentUsers => currentUsers.map(u => {
            if (u.id === manualUserId) {
                const currentPoints = u.points || 0;
                const newPoints = manualAction === 'tambah' ? currentPoints + manualPoints : currentPoints - manualPoints;
                return { ...u, points: newPoints < 0 ? 0 : newPoints };
            }
            return u;
        }));
        setManualPoints(0);
        setManualUserId('');
    };

    const handleSaveLevel = (level: LoyaltyProgram) => {
        updateLoyaltyProgram(level);
        setEditingLevel(null);
    };

    const handleBulkUpload = () => {
        const MOCK_UPLOAD_DATA = [
            { date: '2024-08-01', userId: 'DG12345', produk: 'Bulk Upload Item A', harga: 50000, kuantiti: 10 }, 
            { date: '2024-08-01', userId: 'DG67890', produk: 'Bulk Upload Item B', harga: 200000, kuantiti: 2 }, 
            { date: '2024-08-01', userId: 'NON_EXISTENT_ID', produk: 'Should Fail', harga: 10000, kuantiti: 1},
            { date: '2024-08-01', userId: 'DG12345', produk: 'Bulk Upload Item C', harga: 100000, kuantiti: 1 }, 
        ];
        adminBulkAddTransactions(MOCK_UPLOAD_DATA);
        setShowUploadModal(false);
    }
    
    return (
        <div>
            {editingLevel && (
                <Modal show={true} onClose={() => setEditingLevel(null)} title={`Edit Level: ${editingLevel.level}`}>
                    <LevelForm level={editingLevel} onSave={handleSaveLevel} onCancel={() => setEditingLevel(null)} />
                </Modal>
            )}

            {showUploadModal && (
                 <Modal show={true} onClose={() => setShowUploadModal(false)} title="Upload Transaksi Massal">
                    <div>
                        <p className="mb-4">Pastikan file Excel Anda memiliki kolom berikut dengan urutan yang benar:</p>
                        <div className="bg-gray-100 p-3 rounded-lg text-sm font-mono mb-6">
                            tanggal, id_digipos, produk, harga, kuantiti
                        </div>
                        <p className="text-center text-sm mb-6">Fitur ini akan menyimulasikan proses upload dan perhitungan poin otomatis.</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setShowUploadModal(false)} className="neu-button">Batal</button>
                            <button onClick={handleBulkUpload} className="neu-button text-red-600">Proses Upload (Simulasi)</button>
                        </div>
                    </div>
                </Modal>
            )}

            <h1 className="text-3xl font-bold text-gray-700 mb-6">Manajemen Transaksi & Poin</h1>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="space-y-8">
                     <div className="neu-card p-6">
                        <h2 className="text-xl font-bold text-gray-700 mb-4">Input Transaksi Baru</h2>
                        <form onSubmit={handleTxSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-600 text-sm font-semibold mb-1">Tanggal</label>
                                    <input type="date" name="date" value={txData.date} onChange={handleTxChange} className="input-field" required disabled={isReadOnly}/>
                                </div>
                                 <div>
                                    <label className="block text-gray-600 text-sm font-semibold mb-1">Mitra Outlet</label>
                                    <select name="userId" value={txData.userId} onChange={handleTxChange} className="input-field" required disabled={isReadOnly}>
                                        <option value="">-- Pilih Mitra --</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.profile.nama} ({u.id})</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-gray-600 text-sm font-semibold mb-1">Nama Produk</label>
                                    <input type="text" name="produk" value={txData.produk} onChange={handleTxChange} placeholder="e.g., Pulsa 100K" className="input-field" required disabled={isReadOnly}/>
                                </div>
                                <div>
                                    <label className="block text-gray-600 text-sm font-semibold mb-1">Harga Satuan</label>
                                    <input type="number" min="0" name="harga" value={txData.harga} onChange={handleTxChange} placeholder="e.g., 98000" className="input-field" required disabled={isReadOnly}/>
                                </div>
                                <div>
                                    <label className="block text-gray-600 text-sm font-semibold mb-1">Kuantiti</label>
                                    <input type="number" min="0" name="kuantiti" value={txData.kuantiti} onChange={handleTxChange} placeholder="e.g., 5" className="input-field" required disabled={isReadOnly}/>
                                </div>
                            </div>

                            {selectedUser && (
                                <div className="neu-inset p-3 rounded-lg text-sm space-y-2 mt-4">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Level Mitra:</span>
                                        <span className="font-bold text-gray-800">{selectedUser.level}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Poin Saat Ini:</span>
                                        <span className="font-bold text-gray-800">{(selectedUser.points || 0).toLocaleString('id-ID')} Poin</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Poin Akan Didapat:</span>
                                        <span className="font-bold text-green-600">+{potentialPoints.toLocaleString('id-ID')} Poin</span>
                                    </div>
                                </div>
                            )}

                            <div className="neu-inset p-3 rounded-lg text-center">
                                <p className="text-gray-600">Total Pembelian: <span className="font-bold text-lg text-gray-800">Rp {totalPembelian.toLocaleString('id-ID')}</span></p>
                            </div>
                             <button type="submit" disabled={!txData.userId || totalPembelian <= 0 || isReadOnly} className="neu-button text-red-600 w-full">Tambah Transaksi & Hitung Poin</button>
                        </form>
                    </div>

                    <div className="neu-card p-6">
                         <h2 className="text-xl font-bold text-gray-700 mb-4">Upload Transaksi Massal</h2>
                         <p className="text-sm text-gray-600 mb-4">Gunakan fitur ini untuk meng-upload banyak data transaksi sekaligus dari file Excel.</p>
                         <button onClick={() => setShowUploadModal(true)} className="neu-button w-full" disabled={isReadOnly}>Upload File Excel</button>
                    </div>

                </div>

                <div className="space-y-8">
                     <div className="neu-card p-6 h-fit">
                        <h2 className="text-xl font-bold text-gray-700 mb-4">Update Poin Manual</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-600 text-sm font-semibold mb-2">Pilih Mitra Outlet</label>
                                <select value={manualUserId} onChange={e => setManualUserId(e.target.value)} className="input-field" disabled={isReadOnly}>
                                    <option value="">-- Pilih Mitra --</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.profile.nama} ({u.id})</option>)}
                                </select>
                            </div>
                            {selectedManualUser && (
                                <div className="neu-inset p-3 rounded-lg text-sm space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Level:</span>
                                        <span className="font-bold text-gray-800">{selectedManualUser.level}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Poin Saat Ini:</span>
                                        <span className="font-bold text-gray-800">{(selectedManualUser.points || 0).toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-gray-600 text-sm font-semibold mb-2">Jumlah Poin</label>
                                <input type="number" min="0" value={manualPoints} onChange={e => setManualPoints(parseInt(e.target.value, 10) || 0)} className="input-field" disabled={isReadOnly}/>
                            </div>
                            <div>
                                <label className="block text-gray-600 text-sm font-semibold mb-2">Aksi</label>
                                <div className="flex gap-4">
                                <button onClick={() => setManualAction('tambah')} className={`flex-1 neu-button ${manualAction === 'tambah' ? 'text-green-600 neu-inset' : ''}`} disabled={isReadOnly}>Tambah</button>
                                <button onClick={() => setManualAction('kurang')} className={`flex-1 neu-button ${manualAction === 'kurang' ? 'text-red-600 neu-inset' : ''}`} disabled={isReadOnly}>Kurang</button>
                                </div>
                            </div>
                            <button onClick={handleUpdatePoin} disabled={!manualUserId || manualPoints <= 0 || isReadOnly} className="neu-button text-red-600 w-full">Update Poin</button>
                        </div>
                    </div>

                    <div className="neu-card p-6">
                        <h2 className="text-xl font-bold text-gray-700 mb-4">Aturan Level Loyalitas</h2>
                        <div className="space-y-4">
                            {loyaltyPrograms.map(level => (
                                <div key={level.level} className="neu-card-flat p-4 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-lg text-gray-800">{level.level}</p>
                                        <p className="text-sm text-gray-500">Min: {level.pointsNeeded.toLocaleString('id-ID')} Poin | Pengali: {level.multiplier}x</p>
                                        <p className="text-xs text-gray-600 mt-1">{level.benefit}</p>
                                    </div>
                                    {!isReadOnly && (
                                        <button onClick={() => setEditingLevel(level)} className="neu-button-icon text-blue-600">
                                            <Icon path={ICONS.edit} className="w-5 h-5"/>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ManajemenPoin;