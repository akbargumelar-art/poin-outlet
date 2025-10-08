import React, { useState, useMemo } from 'react';
import { Redemption, User } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import Modal from '../../components/common/Modal';

// --- Status Edit Modal Component ---
const StatusEditModal: React.FC<{
    redemption: Redemption;
    onSave: (status: string, note: string) => void;
    onClose: () => void;
}> = ({ redemption, onSave, onClose }) => {
    const [status, setStatus] = useState(redemption.status || 'Diajukan');
    const [note, setNote] = useState(redemption.statusNote || '');
    const statusOptions = ['Diajukan', 'Diproses', 'Selesai', 'Ditolak'];

    const handleSave = () => {
        onSave(status, note);
    };

    return (
        <Modal show={true} onClose={onClose} title={`Update Status: ${redemption.rewardName}`}>
            <div className="space-y-4">
                <div>
                    <label className="block text-gray-600 text-sm font-semibold mb-2">Status</label>
                    <select value={status} onChange={e => setStatus(e.target.value)} className="input-field">
                        {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
                <div>
                     <label className="block text-gray-600 text-sm font-semibold mb-2">Catatan (Opsional)</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} className="input-field min-h-[80px]" placeholder="e.g., Hadiah sudah bisa diambil di TAP."/>
                </div>
                 <div className="flex justify-end gap-4 pt-4">
                    <button onClick={onClose} className="neu-button">Batal</button>
                    <button onClick={handleSave} className="neu-button text-red-600">Simpan</button>
                </div>
            </div>
        </Modal>
    );
};

interface ManajemenPenukaranProps {
    redemptions: Redemption[];
    users: User[];
    isReadOnly?: boolean;
    adminUpdateRedemptionStatus: (redemptionId: number, status: string, statusNote: string) => void;
}

const ManajemenPenukaran: React.FC<ManajemenPenukaranProps> = ({ redemptions, users, isReadOnly, adminUpdateRedemptionStatus }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState({ from: '', to: '' });
    const [editingRedemption, setEditingRedemption] = useState<Redemption | null>(null);

    const statusColors: { [key: string]: string } = {
        'Diajukan': 'text-blue-600',
        'Diproses': 'text-amber-600',
        'Selesai': 'text-green-600',
        'Ditolak': 'text-red-600',
    };


    const redemptionsWithUserData = useMemo(() => {
        return redemptions.map(r => {
            const user = users.find(u => u.id === r.userId);
            return {
                ...r,
                userTap: user?.profile.tap || '-',
                userSalesforce: user?.profile.salesforce || '-'
            };
        });
    }, [redemptions, users]);

    const filteredRedemptions = useMemo(() => {
        return redemptionsWithUserData.filter(item => {
            const itemDate = new Date(item.date);
            const fromDate = filter.from ? new Date(filter.from) : null;
            const toDate = filter.to ? new Date(filter.to) : null;
            
            if(fromDate) fromDate.setHours(0,0,0,0);
            if(toDate) toDate.setHours(23,59,59,999);

            if (fromDate && itemDate < fromDate) return false;
            if (toDate && itemDate > toDate) return false;

            if (searchTerm.trim()) {
                const lowercasedSearchTerm = searchTerm.toLowerCase();
                return (
                    item.userName?.toLowerCase().includes(lowercasedSearchTerm) ||
                    item.userId.toLowerCase().includes(lowercasedSearchTerm) ||
                    item.rewardName.toLowerCase().includes(lowercasedSearchTerm) ||
                    item.userTap.toLowerCase().includes(lowercasedSearchTerm) ||
                    item.userSalesforce.toLowerCase().includes(lowercasedSearchTerm)
                );
            }
            
            return true;
        });
    }, [redemptionsWithUserData, filter, searchTerm]);
    
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilter(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleResetFilters = () => {
        setFilter({ from: '', to: '' });
        setSearchTerm('');
    };

    const handleUpdateStatus = (status: string, note: string) => {
        if (editingRedemption) {
            adminUpdateRedemptionStatus(editingRedemption.id, status, note);
            setEditingRedemption(null);
        }
    };

    const handleExport = () => {
        if (filteredRedemptions.length === 0) {
            alert("Tidak ada data untuk diekspor dengan filter yang dipilih.");
            return;
        }
    
        const csvHeader = ['Tanggal', 'ID Mitra', 'Nama Mitra', 'TAP', 'Salesforce', 'Hadiah', 'Poin Dihabiskan', 'Status', 'Catatan Status'].join(',');
        
        const csvRows = filteredRedemptions.map(r => {
            const cleanRewardName = `"${(r.rewardName || 'N/A').replace(/"/g, '""')}"`;
            const cleanUserName = `"${(r.userName || 'N/A').replace(/"/g, '""')}"`;
            const formattedDate = new Date(r.date).toLocaleString('id-ID', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            }).replace(/\./g, ':');
            const statusText = r.status || 'Diajukan';
            const statusNote = `"${(r.statusNote || '').replace(/"/g, '""')}"`;

            return [
                formattedDate,
                r.userId,
                cleanUserName,
                r.userTap,
                r.userSalesforce,
                cleanRewardName,
                r.pointsSpent,
                statusText,
                statusNote
            ].join(',');
        });
    
        const csv = [csvHeader, ...csvRows].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'riwayat_penukaran.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div>
             {editingRedemption && !isReadOnly && (
                <StatusEditModal 
                    redemption={editingRedemption}
                    onSave={handleUpdateStatus}
                    onClose={() => setEditingRedemption(null)}
                />
            )}

            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-700">Riwayat Penukaran Poin Mitra</h1>
                <button onClick={handleExport} className="neu-button !w-auto px-4 flex items-center gap-2">
                    <Icon path={ICONS.download} className="w-5 h-5"/>Ekspor Excel
                </button>
            </div>
            
            <div className="mb-6 neu-card-flat p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                <input
                    type="text"
                    placeholder="Cari nama, ID, hadiah..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field lg:col-span-2"
                />
                <div className="flex items-center gap-2 lg:col-span-2">
                    <input type="date" name="from" value={filter.from} onChange={handleFilterChange} className="input-field !w-auto text-sm" />
                    <span className="text-gray-500">-</span>
                    <input type="date" name="to" value={filter.to} onChange={handleFilterChange} className="input-field !w-auto text-sm" />
                    <button onClick={handleResetFilters} className="neu-button-icon !p-2" title="Clear Filter">
                        <Icon path={ICONS.close} className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="neu-card-flat overflow-hidden">
                <div className="overflow-auto max-h-[60vh]">
                    <table className="w-full min-w-max text-left">
                        <thead className="bg-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600 whitespace-nowrap">Tanggal</th>
                                <th className="p-4 font-semibold text-gray-600">Nama Mitra</th>
                                <th className="p-4 font-semibold text-gray-600 whitespace-nowrap">TAP</th>
                                <th className="p-4 font-semibold text-gray-600 whitespace-nowrap">Salesforce</th>
                                <th className="p-4 font-semibold text-gray-600">Hadiah</th>
                                <th className="p-4 font-semibold text-gray-600">Status</th>
                                <th className="p-4 font-semibold text-gray-600 text-right whitespace-nowrap">Poin Digunakan</th>
                                {!isReadOnly && <th className="p-4 font-semibold text-gray-600">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRedemptions.length > 0 ? filteredRedemptions.map((item, index) => (
                                <tr key={item.id || index} className="border-t border-slate-200/80">
                                    <td className="p-4 whitespace-nowrap">{new Date(item.date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                    <td className="p-4">
                                        <p className="font-semibold text-gray-800">{item.userName || 'Nama Tidak Ditemukan'}</p>
                                        <p className="text-xs text-gray-500 font-mono">{item.userId}</p>
                                    </td>
                                    <td className="p-4 whitespace-nowrap">{item.userTap}</td>
                                    <td className="p-4 whitespace-nowrap">{item.userSalesforce}</td>
                                    <td className="p-4 font-semibold">{item.rewardName}</td>
                                    <td className="p-4 whitespace-nowrap">
                                        <p className={`font-semibold ${statusColors[item.status || 'Diajukan'] || 'text-gray-700'}`}>
                                            {item.status || 'Diajukan'}
                                        </p>
                                        {item.status === 'Selesai' && item.statusUpdatedAt && 
                                            <p className="text-xs text-gray-500">
                                                pada {new Date(item.statusUpdatedAt).toLocaleDateString('id-ID')}
                                            </p>
                                        }
                                        {item.statusNote && <p className="text-xs text-gray-500 italic">"{item.statusNote}"</p>}
                                    </td>
                                    <td className="p-4 font-bold text-right text-red-600 whitespace-nowrap">{item.pointsSpent.toLocaleString('id-ID')}</td>
                                    {!isReadOnly && (
                                        <td className="p-4">
                                            <button onClick={() => setEditingRedemption(item)} className="neu-button-icon text-blue-600">
                                                <Icon path={ICONS.edit} className="w-5 h-5"/>
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            )) : (
                                 <tr>
                                    <td colSpan={isReadOnly ? 7 : 8} className="p-8 text-center text-gray-500">Tidak ada riwayat penukaran yang cocok.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManajemenPenukaran;