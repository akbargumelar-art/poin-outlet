
import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { Redemption, User } from '../../types';
// Fix: Import Icon from root components to resolve missing default export in src/components
import Icon from '../../../components/common/Icon';
import { ICONS } from '../../constants';
// Fix: Import Modal from root components to resolve missing default export in src/components
import Modal from '../../../components/common/Modal';
// Fix: Import Pagination from root components to resolve missing default export in src/components
import Pagination from '../../../components/common/Pagination';

// --- Status Edit Modal Component ---
const StatusEditModal: React.FC<{
    redemption: Redemption;
    onSave: (status: string, note: string, photoFile: File | null) => void;
    onClose: () => void;
}> = ({ redemption, onSave, onClose }) => {
    const [status, setStatus] = useState(redemption.status || 'Diajukan');
    const [note, setNote] = useState(redemption.statusNote || '');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(redemption.documentationPhotoUrl || null);

    const statusOptions = ['Diajukan', 'Diproses', 'Selesai', 'Ditolak'];

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
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
                
                {status === 'Selesai' && (
                    <div className="animate-fade-in-down">
                        <label className="block text-gray-600 text-sm font-semibold mb-2">Bukti Dokumentasi</label>
                        <div className="flex items-center gap-4 border border-dashed border-gray-300 p-4 rounded-lg bg-gray-50">
                            {photoPreview ? (
                                <img src={photoPreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg shadow-sm" />
                            ) : (
                                <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                                    <Icon path={ICONS.camera} className="w-8 h-8" />
                                </div>
                            )}
                            <div>
                                <label htmlFor="doc-upload" className="neu-button !w-auto px-4 py-2 cursor-pointer text-sm">Pilih Foto</label>
                                <input id="doc-upload" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                            </div>
                        </div>
                    </div>
                )}

                <div>
                     <label className="block text-gray-600 text-sm font-semibold mb-2">Catatan</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} className="input-field min-h-[80px]" placeholder="Misal: Hadiah sudah dikirim ke TAP..."/>
                </div>
                 <div className="flex justify-end gap-4 pt-4">
                    <button onClick={onClose} className="neu-button">Batal</button>
                    <button onClick={() => onSave(status, note, photoFile)} className="neu-button text-red-600">Simpan Perubahan</button>
                </div>
            </div>
        </Modal>
    );
};

// --- Bulk Status Update Modal ---
const BulkStatusModal: React.FC<{
    count: number;
    onSave: (status: string, note: string) => void;
    onClose: () => void;
}> = ({ count, onSave, onClose }) => {
    const [status, setStatus] = useState('Diproses');
    const [note, setNote] = useState('');
    return (
        <Modal show={true} onClose={onClose} title={`Update Massal (${count} Data)`}>
            <div className="space-y-4">
                <p className="text-sm text-gray-600">Anda mengubah status untuk {count} data terpilih.</p>
                <select value={status} onChange={e => setStatus(e.target.value)} className="input-field">
                    <option value="Diajukan">Diajukan</option>
                    <option value="Diproses">Diproses</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Ditolak">Ditolak</option>
                </select>
                <textarea value={note} onChange={e => setNote(e.target.value)} className="input-field min-h-[80px]" placeholder="Catatan massal..."/>
                 <div className="flex justify-end gap-4 pt-4">
                    <button onClick={onClose} className="neu-button">Batal</button>
                    <button onClick={() => onSave(status, note)} className="neu-button text-red-600">Update Semua</button>
                </div>
            </div>
        </Modal>
    );
};

interface ManajemenPenukaranProps {
    redemptions: Redemption[];
    users: User[];
    isReadOnly?: boolean;
    adminUpdateRedemptionStatus: (id: number, status: string, note: string, photo?: File | null) => void;
    adminBulkUpdateRedemptionStatus: (ids: number[], status: string, note: string) => void;
}

const ManajemenPenukaran: React.FC<ManajemenPenukaranProps> = ({ redemptions, users, isReadOnly, adminUpdateRedemptionStatus, adminBulkUpdateRedemptionStatus }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [tapFilter, setTapFilter] = useState('');
    const [salesforceFilter, setSalesforceFilter] = useState('');
    const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
    const [isSyncing, setIsSyncing] = useState(false);

    const [editingRedemption, setEditingRedemption] = useState<Redemption | null>(null);
    const [viewingPhoto, setViewingPhoto] = useState<Redemption | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;

    const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

    const redemptionsWithUserData = useMemo(() => {
        return redemptions.map(r => {
            const user = userMap.get(r.userId);
            return {
                ...r,
                userTap: user?.profile.tap || '-',
                userSalesforce: user?.profile.salesforce || '-'
            };
        });
    }, [redemptions, userMap]);

    const uniqueTaps = useMemo(() => [...new Set(redemptionsWithUserData.map(r => r.userTap).filter(t => t !== '-'))].sort(), [redemptionsWithUserData]);
    const uniqueSalesforces = useMemo(() => [...new Set(redemptionsWithUserData.map(r => r.userSalesforce).filter(s => s !== '-'))].sort(), [redemptionsWithUserData]);

    const filteredRedemptions = useMemo(() => {
        return redemptionsWithUserData.filter(item => {
            const itemDate = new Date(item.date);
            const fromDate = dateFilter.from ? new Date(filter.from) : null;
            const toDate = dateFilter.to ? new Date(filter.to) : null;
            if (fromDate) fromDate.setHours(0,0,0,0);
            if (toDate) toDate.setHours(23,59,59,999);

            if (fromDate && itemDate < fromDate) return false;
            if (toDate && itemDate > toDate) return false;
            if (statusFilter && (item.status || 'Diajukan') !== statusFilter) return false;
            if (tapFilter && item.userTap !== tapFilter) return false;
            if (salesforceFilter && item.userSalesforce !== salesforceFilter) return false;

            if (searchTerm.trim()) {
                const low = searchTerm.toLowerCase();
                return (
                    item.id.toString().includes(low) || 
                    item.userName?.toLowerCase().includes(low) || 
                    item.userId?.toLowerCase().includes(low) ||
                    item.rewardName.toLowerCase().includes(low)
                );
            }
            return true;
        });
    }, [redemptionsWithUserData, dateFilter, searchTerm, statusFilter, tapFilter, salesforceFilter]);

    const summaryStats = useMemo(() => {
        const stats = { Total: 0, Diajukan: 0, Diproses: 0, Selesai: 0, Ditolak: 0 };
        filteredRedemptions.forEach(r => {
            stats.Total++;
            const s = r.status || 'Diajukan';
            if (s in stats) stats[s as keyof typeof stats]++;
        });
        return stats;
    }, [filteredRedemptions]);

    const rewardStats = useMemo(() => {
        const stats: Record<string, number> = {};
        filteredRedemptions.forEach(r => {
            stats[r.rewardName] = (stats[r.rewardName] || 0) + 1;
        });
        return Object.entries(stats).sort((a,b) => b[1] - a[1]).slice(0, 8);
    }, [filteredRedemptions]);

    const handleProactiveSync = async () => {
        if (!window.confirm("Aplikasi akan menarik data terbaru dari AppSheet. Lanjutkan?")) return;
        setIsSyncing(true);
        try {
            const response = await axios.post('/api/integration/appsheet/sync-all');
            alert(response.data.message);
            window.location.reload(); 
        } catch (error: any) {
            alert("Gagal Sinkronisasi: " + (error.response?.data?.message || error.message));
        } finally {
            setIsSyncing(false);
        }
    };

    const handleExport = (type: 'standard' | 'appsheet') => {
        if (filteredRedemptions.length === 0) return alert("Tidak ada data.");
        let headers: string[], rows: any[];

        if (type === 'appsheet') {
            headers = ['Tanggal','Long - Lat','TAP','Surveyor','Nama Surveyor','ID Digipos','Nama Outlet','Hadiah','ID Redeem','Penerima Hadiah','Nama Penerima','Photo Dokumentasi'];
            rows = filteredRedemptions.map(r => {
                const d = new Date(r.date);
                return [`${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`,'',r.userTap,'Salesforce','',r.userId,`"${r.userName?.replace(/"/g, '""')}"`,`"${r.rewardName.replace(/"/g, '""')}"`,r.id,'','',''].join(',');
            });
        } else {
            headers = ['ID','Tanggal','Mitra','ID Digipos','TAP','Hadiah','Poin','Status'];
            rows = filteredRedemptions.map(r => [r.id, r.date, `"${r.userName?.replace(/"/g, '""')}"`, r.userId, r.userTap, `"${r.rewardName.replace(/"/g, '""')}"`, r.pointsSpent, r.status].join(','));
        }

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = type === 'appsheet' ? 'template_appsheet.csv' : 'riwayat_penukaran.csv';
        link.click();
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setStatusFilter('');
        setTapFilter('');
        setSalesforceFilter('');
        setDateFilter({ from: '', to: '' });
        setSelectedIds(new Set());
    };

    const currentItems = filteredRedemptions.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage);

    return (
        <div className="space-y-6">
            {editingRedemption && !isReadOnly && (
                <StatusEditModal redemption={editingRedemption} onClose={() => setEditingRedemption(null)} onSave={(s, n, p) => { adminUpdateRedemptionStatus(editingRedemption.id, s, n, p); setEditingRedemption(null); }} />
            )}
            {viewingPhoto && (
                <Modal show={true} onClose={() => setViewingPhoto(null)} title={`Dokumentasi: ${viewingPhoto.rewardName}`}>
                    <div className="space-y-4">
                        <img src={viewingPhoto.documentationPhotoUrl} className="w-full rounded-lg shadow-sm border" alt="Bukti" />
                        <div className="bg-slate-50 p-4 rounded-lg text-sm space-y-2">
                             <p><b>Mitra:</b> {viewingPhoto.userName} ({viewingPhoto.userId})</p>
                             <p><b>Lokasi:</b> {viewingPhoto.locationCoordinates || '-'}</p>
                             <p><b>Penerima:</b> {viewingPhoto.receiverName || '-'}</p>
                             <p><b>Catatan Admin:</b> {viewingPhoto.statusNote || '-'}</p>
                        </div>
                        <button onClick={() => setViewingPhoto(null)} className="neu-button w-full">Tutup</button>
                    </div>
                </Modal>
            )}
            {showBulkModal && (
                <BulkStatusModal count={selectedIds.size} onClose={() => setShowBulkModal(false)} onSave={(s, n) => { adminBulkUpdateRedemptionStatus(Array.from(selectedIds), s, n); setShowBulkModal(false); setSelectedIds(new Set()); }} />
            )}

            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-700">Penukaran Hadiah</h1>
                <div className="flex gap-2 flex-wrap">
                    {selectedIds.size > 0 && !isReadOnly && (
                        <button onClick={() => setShowBulkModal(true)} className="neu-button !w-auto px-4 bg-purple-600 text-white shadow-md">Update {selectedIds.size} Terpilih</button>
                    )}
                    <button onClick={handleProactiveSync} disabled={isSyncing} className={`neu-button !w-auto px-4 flex items-center gap-2 ${isSyncing ? 'opacity-50' : 'bg-blue-600 text-white shadow-md'}`}>
                        <Icon path={ICONS.history} className={isSyncing ? 'animate-spin' : ''}/> {isSyncing ? 'Sinkronisasi...' : 'Sinkronisasi AppSheet'}
                    </button>
                    <button onClick={() => handleExport('appsheet')} className="neu-button !w-auto px-4 bg-green-600 text-white shadow-md">Template AppSheet</button>
                    <button onClick={() => handleExport('standard')} className="neu-button !w-auto px-4">Ekspor CSV</button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(summaryStats).map(([label, val]) => (
                    <div key={label} className="neu-card p-4 text-center border-b-4 border-slate-300">
                        <p className="text-xs font-bold text-gray-500 uppercase">{label}</p>
                        <p className="text-2xl font-bold text-gray-800">{val}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {rewardStats.map(([name, count]) => (
                    <div key={name} className="neu-card-flat p-2 text-center bg-white">
                        <p className="text-[10px] text-gray-500 font-bold truncate uppercase">{name}</p>
                        <p className="text-lg font-bold text-red-600">{count}</p>
                    </div>
                ))}
            </div>

            <div className="neu-card-flat p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <input type="text" placeholder="Cari nama, ID, Hadiah..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-field" />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field">
                        <option value="">Semua Status</option>
                        <option value="Diajukan">Diajukan</option>
                        <option value="Diproses">Diproses</option>
                        <option value="Selesai">Selesai</option>
                        <option value="Ditolak">Ditolak</option>
                    </select>
                    <select value={tapFilter} onChange={e => setTapFilter(e.target.value)} className="input-field">
                        <option value="">Semua TAP</option>
                        {uniqueTaps.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={salesforceFilter} onChange={e => setSalesforceFilter(e.target.value)} className="input-field">
                        <option value="">Semua Salesforce</option>
                        {uniqueSalesforces.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4 pt-4 border-t">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">Dari:</span>
                        <input type="date" value={dateFilter.from} onChange={e => setDateFilter(prev => ({...prev, from: e.target.value}))} className="input-field !py-1.5" />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">Sampai:</span>
                        <input type="date" value={dateFilter.to} onChange={e => setDateFilter(prev => ({...prev, to: e.target.value}))} className="input-field !py-1.5" />
                    </div>
                    <button onClick={handleResetFilters} className="neu-button !w-auto px-6 ml-auto bg-slate-200">Reset Filter</button>
                </div>
            </div>

            <div className="neu-card-flat overflow-hidden">
                <div className="overflow-auto min-h-[400px]">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-200">
                            <tr>
                                {!isReadOnly && <th className="p-4 w-10"><input type="checkbox" className="w-5 h-5 cursor-pointer" checked={selectedIds.size > 0 && selectedIds.size === currentItems.length} onChange={(e) => setSelectedIds(e.target.checked ? new Set(currentItems.map(i => i.id)) : new Set())} /></th>}
                                <th className="p-4">Waktu</th>
                                <th className="p-4">Mitra Outlet</th>
                                <th className="p-4">TAP / Salesforce</th>
                                <th className="p-4">Hadiah</th>
                                <th className="p-4 text-right">Poin</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.map((item) => (
                                <tr key={item.id} className={`border-t border-slate-200/80 hover:bg-white/50 ${selectedIds.has(item.id) ? 'bg-purple-50' : ''}`}>
                                    {!isReadOnly && <td className="p-4"><input type="checkbox" className="w-5 h-5 cursor-pointer" checked={selectedIds.has(item.id)} onChange={() => { const s = new Set(selectedIds); if(s.has(item.id)) s.delete(item.id); else s.add(item.id); setSelectedIds(s); }} /></td>}
                                    <td className="p-4 whitespace-nowrap">
                                        <div className="font-bold">{new Date(item.date).toLocaleDateString('id-ID')}</div>
                                        <div className="text-[10px] text-gray-400">ID: {item.id}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-gray-800">{item.userName}</div>
                                        <div className="text-xs font-mono text-gray-500">{item.userId}</div>
                                    </td>
                                    <td className="p-4">
                                        <div>{item.userTap}</div>
                                        <div className="text-xs text-gray-400">{item.userSalesforce}</div>
                                    </td>
                                    <td className="p-4 font-semibold text-blue-700">{item.rewardName}</td>
                                    <td className="p-4 text-right font-bold text-red-600">{item.pointsSpent.toLocaleString('id-ID')}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                                            item.