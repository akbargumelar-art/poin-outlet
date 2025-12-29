
import React, { useState, useMemo, useEffect } from 'react';
import { Redemption, User } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';

// --- Modals (StatusEditModal, BulkStatusModal) tetap sama ---

interface ManajemenPenukaranProps {
    redemptions: Redemption[];
    users: User[];
    isReadOnly?: boolean;
    adminUpdateRedemptionStatus: (redemptionId: number, status: string, statusNote: string, photoFile?: File | null) => void;
    adminBulkUpdateRedemptionStatus: (ids: number[], status: string, statusNote: string) => void;
}

const ManajemenPenukaran: React.FC<ManajemenPenukaranProps> = ({ redemptions, users, isReadOnly, adminUpdateRedemptionStatus, adminBulkUpdateRedemptionStatus }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState({ from: '', to: '' });
    const [statusFilter, setStatusFilter] = useState('');
    const [tapFilter, setTapFilter] = useState('');
    const [salesforceFilter, setSalesforceFilter] = useState('');

    const [editingRedemption, setEditingRedemption] = useState<Redemption | null>(null);
    const [viewingPhoto, setViewingPhoto] = useState<Redemption | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

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
            if (statusFilter && (item.status || 'Diajukan') !== statusFilter) return false;
            if (tapFilter && item.userTap !== tapFilter) return false;
            if (salesforceFilter && item.userSalesforce !== salesforceFilter) return false;

            if (searchTerm.trim()) {
                const lower = searchTerm.toLowerCase();
                return (item.id.toString().includes(lower) || item.userName?.toLowerCase().includes(lower) || item.userId.toLowerCase().includes(lower) || item.rewardName.toLowerCase().includes(lower));
            }
            return true;
        });
    }, [redemptionsWithUserData, filter, searchTerm, statusFilter, tapFilter, salesforceFilter]);

    // --- TEMPLATE APPSHEET DISESUAIKAN GAMBAR USER ---
    const handleExportAppSheet = () => {
        // Nama Kolom & Urutan Harus Sesuai Screenshot Agar AppSheet bisa import otomatis
        const headers = [
            'ID',               // Kolom A (Internal AppSheet)
            'Tanggal',          // Kolom B
            'Long - Lat',       // Kolom C
            'TAP',              // Kolom D
            'Surveyor',         // Kolom E
            'Nama Surveyor',    // Kolom F
            'ID Digipos',       // Kolom G
            'Nama Outlet',      // Kolom H
            'Hadiah',           // Kolom I
            'ID Redeem',        // Kolom J (PRIMARY KEY LINK KE WEB)
            'Penerima Hadiah',  // Kolom K
            'Nama Penerima',    // Kolom L
            'Photo Dokumentasi' // Kolom M
        ];

        const rows = filteredRedemptions.map(r => {
            const d = new Date(r.date);
            const dateStr = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
            return [
                '',                     // ID (Dikosongkan biar diisi AppSheet)
                dateStr,                // Tanggal
                '',                     // Long - Lat
                r.userTap,              // TAP
                'Salesforce',           // Surveyor
                r.surveyorName || '',   // Nama Surveyor
                r.userId,               // ID Digipos
                `"${r.userName}"`,      // Nama Outlet
                `"${r.rewardName}"`,    // Hadiah
                r.id,                   // ID Redeem (KUNCI UTAMA SINKRONISASI)
                r.receiverRole || '',   // Penerima Hadiah
                r.receiverName || '',   // Nama Penerima
                ''                      // Photo Dokumentasi
            ].join(',');
        });

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `template_appsheet_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
    };

    // UI Tabel dsb tetap sama ...
    return (
        <div>
            {/* Modal components ... */}
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-700">Penukaran Hadiah</h1>
                <div className="flex gap-2">
                    <button onClick={handleExportAppSheet} className="neu-button !w-auto px-4 flex items-center gap-2 bg-green-600 text-white shadow-md">
                        <Icon path={ICONS.simCard} className="w-5 h-5"/>Template AppSheet
                    </button>
                    <button onClick={() => {}} className="neu-button !w-auto px-4 flex items-center gap-2">
                        <Icon path={ICONS.download} className="w-5 h-5"/>Ekspor Laporan
                    </button>
                </div>
            </div>

            <div className="neu-card-flat overflow-hidden">
                <div className="overflow-auto min-h-[400px]">
                    <table className="w-full min-w-max text-left text-sm">
                        <thead className="bg-slate-200 sticky top-0 z-10">
                            <tr>
                                {!isReadOnly && <th className="p-4 w-10">Select</th>}
                                <th className="p-4 font-semibold text-gray-600">ID Redeem</th>
                                <th className="p-4 font-semibold text-gray-600">Nama Mitra</th>
                                <th className="p-4 font-semibold text-gray-600">Hadiah</th>
                                <th className="p-4 font-semibold text-gray-600">Status</th>
                                <th className="p-4 font-semibold text-gray-600">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRedemptions.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage).map((item) => (
                                <tr key={item.id} className="border-t border-slate-200/80">
                                    {!isReadOnly && <td className="p-4"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => {}} /></td>}
                                    <td className="p-4 font-mono font-bold text-red-600">{item.id}</td>
                                    <td className="p-4">
                                        <p className="font-bold">{item.userName}</p>
                                        <p className="text-xs text-gray-500">{item.userId}</p>
                                    </td>
                                    <td className="p-4 font-semibold">{item.rewardName}</td>
                                    <td className="p-4 font-bold">
                                        <span className={item.status === 'Selesai' ? 'text-green-600' : 'text-amber-600'}>
                                            {item.status || 'Diajukan'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <button onClick={() => setViewingPhoto(item)} className="neu-button-icon text-purple-600"><Icon path={ICONS.eye} className="w-5 h-5"/></button>
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
