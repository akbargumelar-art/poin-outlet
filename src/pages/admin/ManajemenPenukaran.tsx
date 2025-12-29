
import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { Redemption, User } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';

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
                    <textarea value={note} onChange={e => setNote(e.target.value)} className="input-field min-h-[80px]" />
                </div>
                 <div className="flex justify-end gap-4 pt-4">
                    <button onClick={onClose} className="neu-button">Batal</button>
                    <button onClick={() => onSave(status, note, photoFile)} className="neu-button text-red-600">Simpan</button>
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
                <p className="text-sm text-gray-600">Anda mengubah status untuk {count} data.</p>
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
    const itemsPerPage = 20;

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
            const fromDate = dateFilter.from ? new Date(dateFilter.from) : null;
            const toDate = dateFilter.to ? new Date(dateFilter.to) : null;
            if (fromDate) fromDate.setHours(0,0,0,0);
            if (toDate) toDate.setHours(23,59,59,999);

            if (fromDate && itemDate < fromDate) return false;
            if (toDate && itemDate > toDate) return false;
            if (statusFilter && (item.status || 'Diajukan') !== statusFilter) return false;
            if (tapFilter && item.userTap !== tapFilter) return false;
            if (salesforceFilter && item.userSalesforce !== salesforceFilter) return false;

            if (searchTerm.trim()) {
                const low = searchTerm.toLowerCase();
                return item.id.toString().includes(low) || item.userName?.toLowerCase().includes(low) || item.rewardName.toLowerCase().includes(low);
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
                return [`${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`,'',r.userTap,'Salesforce','',r.userId,`"${r.userName}"`,`"${r.rewardName}"`,r.id,'','',''].join(',');
            });
        } else {
            headers = ['ID','Tanggal','Mitra','TAP','Hadiah','Poin','Status'];
            rows = filteredRedemptions.map(r => [r.id, r.date, `"${r.userName}"`, r.userTap, `"${r.rewardName}"`, r.pointsSpent, r.status].join(','));
        }

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = type === 'appsheet' ? 'template_appsheet.csv' : 'riwayat_penukaran.csv';
        link.click();
    };

    const currentItems = filteredRedemptions.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage);

    return (
        <div className="space-y-6">
            {editingRedemption && !isReadOnly && (
                <StatusEditModal redemption={editingRedemption} onClose={() => setEditingRedemption(null)} onSave={(s, n, p) => { adminUpdateRedemptionStatus(editingRedemption.id, s, n, p); setEditingRedemption(null); }} />
            )}
            {viewingPhoto && (
                <Modal show={true} onClose={() => setViewingPhoto(null)} title="Detail Dokumentasi">
                    <div className="space-y-4">
                        <img src={viewingPhoto.documentationPhotoUrl} className="w-full rounded-lg shadow-sm" alt="Bukti" />
                        <p className="text-sm"><b>Mitra:</b> {viewingPhoto.userName}</p>
                        <p className="text-sm"><b>Hadiah:</b> {viewingPhoto.rewardName}</p>
                        <p className="text-sm"><b>Catatan:</b> {viewingPhoto.statusNote || '-'}</p>
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
                        <Icon path={ICONS.history} className={isSyncing ? 'animate-spin' : ''}/> {isSyncing ? 'Sinkronisasi...' : 'Sinkronisasi 2 Arah'}
                    </button>
                    <button onClick={() => handleExport('appsheet')} className="neu-button !w-auto px-4 bg-green-600 text-white shadow-md">Template AppSheet</button>
                    <button onClick={() => handleExport('standard')} className="neu-button !w-auto px-4">Ekspor CSV</button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(summaryStats).map(([label, val]) => (
                    <div key={label} className="neu-card p-4 text-center">
                        <p className="text-xs font-bold text-gray-500 uppercase">{label}</p>
                        <p className="text-2xl font-bold text-gray-800">{val}</p>
                    </div>
                ))}
            </div>

            <div className="neu-card-flat p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input type="text" placeholder="Cari nama, ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-field" />
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
            </div>

            <div className="neu-card-flat overflow-hidden">
                <div className="overflow-auto min-h-[400px]">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-200">
                            <tr>
                                {!isReadOnly && <th className="p-4 w-10"><input type="checkbox" className="w-5 h-5" onChange={(e) => setSelectedIds(e.target.checked ? new Set(currentItems.map(i => i.id)) : new Set())} /></th>}
                                <th className="p-4">Waktu</th>
                                <th className="p-4">ID Mitra</th>
                                <th className="p-4">Nama Mitra</th>
                                <th className="p-4">TAP</th>
                                <th className="p-4">Hadiah</th>
                                <th className="p-4 text-right">Poin</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.map((item) => (
                                <tr key={item.id} className={`border-t border-slate-200/80 ${selectedIds.has(item.id) ? 'bg-purple-50' : ''}`}>
                                    {!isReadOnly && <td className="p-4"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => { const s = new Set(selectedIds); if(s.has(item.id)) s.delete(item.id); else s.add(item.id); setSelectedIds(s); }} /></td>}
                                    <td className="p-4 whitespace-nowrap">{new Date(item.date).toLocaleDateString('id-ID')}</td>
                                    <td className="p-4 font-mono">{item.userId}</td>
                                    <td className="p-4 font-bold">{item.userName}</td>
                                    <td className="p-4">{item.userTap}</td>
                                    <td className="p-4 font-semibold">{item.rewardName}</td>
                                    <td className="p-4 text-right font-bold text-red-600">{item.pointsSpent}</td>
                                    <td className="p-4">
                                        <span className={`font-bold ${item.status === 'Selesai' ? 'text-green-600' : 'text-amber-600'}`}>
                                            {item.status || 'Diajukan'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <button onClick={() => setViewingPhoto(item)} disabled={!item.documentationPhotoUrl} className="neu-button-icon text-purple-600 disabled:opacity-30"><Icon path={ICONS.eye} className="w-5 h-5"/></button>
                                            {!isReadOnly && <button onClick={() => setEditingRedemption(item)} className="neu-button-icon text-blue-600"><Icon path={ICONS.edit} className="w-5 h-5"/></button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <Pagination itemsPerPage={itemsPerPage} totalItems={filteredRedemptions.length} paginate={setCurrentPage} currentPage={currentPage} />
        </div>
    );
};

export default ManajemenPenukaran;
