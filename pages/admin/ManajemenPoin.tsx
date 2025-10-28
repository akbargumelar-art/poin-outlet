
import React, { useState, useEffect } from 'react';
import { User, LoyaltyProgram, Transaction } from '../../types';
import Modal from '../../components/common/Modal';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';

// --- Main Component ---
interface ManajemenPoinProps {
    currentUser: User;
    users: User[];
    loyaltyPrograms: LoyaltyProgram[];
    updateLoyaltyProgram: (program: LoyaltyProgram) => void;
    adminAddTransaction: (data: Omit<Transaction, 'id' | 'pointsEarned'>) => void;
    adminBulkAddTransactions: (file: File) => void;
    adminUpdatePointsManual: (userId: string, points: number, action: 'tambah' | 'kurang') => void;
    adminBulkUpdateLevels: (file: File) => void;
    isReadOnly?: boolean;
}

const ManajemenPoin: React.FC<ManajemenPoinProps> = ({ currentUser, users, loyaltyPrograms, updateLoyaltyProgram, adminAddTransaction, adminBulkAddTransactions, adminUpdatePointsManual, adminBulkUpdateLevels, isReadOnly }) => {
    const [manualUserId, setManualUserId] = useState('');
    const [manualPoints, setManualPoints] = useState(0);
    const [manualAction, setManualAction] = useState<'tambah' | 'kurang'>('tambah');
    const [txData, setTxData] = useState({ userId: '', produk: '', harga: 0, kuantiti: 0, date: new Date().toISOString().split('T')[0]});
    
    const [showTxUploadModal, setShowTxUploadModal] = useState(false);
    const [txUploadFile, setTxUploadFile] = useState<File | null>(null);
    
    const [showLevelUploadModal, setShowLevelUploadModal] = useState(false);
    const [levelUploadFile, setLevelUploadFile] = useState<File | null>(null);

    const isOperator = currentUser.role === 'operator';

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
        adminUpdatePointsManual(manualUserId, manualPoints, manualAction);
        setManualPoints(0);
        setManualUserId('');
    };
    
    const handleTxFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setTxUploadFile(e.target.files[0]);
        }
    };

    const handleBulkTxUpload = () => {
        if (txUploadFile) {
            adminBulkAddTransactions(txUploadFile);
            setShowTxUploadModal(false);
            setTxUploadFile(null);
        }
    }

    const handleLevelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setLevelUploadFile(e.target.files[0]);
        }
    };

    const handleBulkLevelUpload = () => {
        if (levelUploadFile) {
            adminBulkUpdateLevels(levelUploadFile);
            setShowLevelUploadModal(false);
            setLevelUploadFile(null);
        }
    }
    
    return (
        <div>
            {showTxUploadModal && (
                 <Modal show={true} onClose={() => setShowTxUploadModal(false)} title="Upload Transaksi Massal">
                    <div>
                        <p className="mb-4">Pastikan file Excel Anda memiliki kolom berikut dengan urutan yang benar:</p>
                        <div className="bg-gray-100 p-3 rounded-lg text-sm font-mono mb-4">
                            tanggal, id_digipos, produk, harga, kuantiti
                        </div>
                        <a href="/template_transaksi.xlsx" download className="neu-button !w-auto px-4 flex items-center gap-2 mb-6">
                            <Icon path={ICONS.download} className="w-5 h-5"/>
                            Download Template
                        </a>
                        <div className="mb-6">
                            <label className="block text-gray-600 text-sm font-semibold mb-2">Pilih File Excel</label>
                            <input 
                                type="file" 
                                accept=".xlsx, .xls"
                                onChange={handleTxFileChange}
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                            />
                        </div>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setShowTxUploadModal(false)} className="neu-button">Batal</button>
                            <button onClick={handleBulkTxUpload} className="neu-button text-red-600" disabled={!txUploadFile}>Proses Upload</button>
                        </div>
                    </div>
                </Modal>
            )}

            {showLevelUploadModal && (
                 <Modal show={true} onClose={() => setShowLevelUploadModal(false)} title="Upload Level Mitra Massal">
                    <div>
                        <p className="mb-4">Pastikan file Excel Anda memiliki kolom berikut dengan urutan yang benar:</p>
                        <div className="bg-gray-100 p-3 rounded-lg text-sm font-mono mb-4">
                            id_digipos, level
                        </div>
                        <a href="/template_level.xlsx" download className="neu-button !w-auto px-4 flex items-center gap-2 mb-6">
                            <Icon path={ICONS.download} className="w-5 h-5"/>
                            Download Template
                        </a>
                        <div className="mb-6">
                            <label className="block text-gray-600 text-sm font-semibold mb-2">Pilih File Excel</label>
                            <input 
                                type="file" 
                                accept=".xlsx, .xls"
                                onChange={handleLevelFileChange}
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                            />
                        </div>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setShowLevelUploadModal(false)} className="neu-button">Batal</button>
                            <button onClick={handleBulkLevelUpload} className="neu-button text-red-600" disabled={!levelUploadFile}>Proses Upload</button>
                        </div>
                    </div>
                </Modal>
            )}

            <h1 className="text-2xl md:text-3xl font-bold text-gray-700 mb-6">Manajemen Transaksi & Poin</h1>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="space-y-8">
                    {!isOperator && (
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
                                            <span className="font-bold text-gray-800">{(selectedUser.points || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })} Poin</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Poin Akan Didapat:</span>
                                            <span className="font-bold text-green-600">+{potentialPoints.toLocaleString('id-ID', { maximumFractionDigits: 2 })} Poin</span>
                                        </div>
                                    </div>
                                )}

                                <div className="neu-inset p-3 rounded-lg text-center">
                                    <p className="text-gray-600">Total Pembelian: <span className="font-bold text-lg text-gray-800">Rp {totalPembelian.toLocaleString('id-ID', { maximumFractionDigits: 2 })}</span></p>
                                </div>
                                <button type="submit" disabled={!txData.userId || totalPembelian <= 0 || isReadOnly} className="neu-button text-red-600 w-full">Tambah Transaksi & Hitung Poin</button>
                            </form>
                        </div>
                    )}

                    <div className="neu-card p-6">
                         <h2 className="text-xl font-bold text-gray-700 mb-4">Upload Massal</h2>
                         <p className="text-sm text-gray-600 mb-4">Gunakan fitur ini untuk meng-upload banyak data sekaligus dari file Excel.</p>
                         <div className="flex flex-col md:flex-row gap-4">
                            <button onClick={() => setShowTxUploadModal(true)} className="neu-button w-full flex-1" disabled={isReadOnly}>Upload Transaksi</button>
                            {!isOperator && <button onClick={() => setShowLevelUploadModal(true)} className="neu-button w-full flex-1" disabled={isReadOnly}>Upload Level Mitra</button>}
                         </div>
                    </div>
                </div>

                {!isOperator && (
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
                                            <span className="font-bold text-gray-800">{(selectedManualUser.points || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}</span>
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
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManajemenPoin;