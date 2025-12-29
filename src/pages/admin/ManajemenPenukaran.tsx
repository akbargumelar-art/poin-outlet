
import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { Redemption, User } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';

interface ManajemenPenukaranProps {
    redemptions: Redemption[];
    users: User[];
    isReadOnly?: boolean;
    adminUpdateRedemptionStatus: (redemptionId: number, status: string, statusNote: string, photoFile?: File | null) => void;
    adminBulkUpdateRedemptionStatus: (ids: number[], status: string, statusNote: string) => void;
}

const ManajemenPenukaran: React.FC<ManajemenPenukaranProps> = ({ redemptions, users, isReadOnly, adminUpdateRedemptionStatus, adminBulkUpdateRedemptionStatus }) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const filteredRedemptions = useMemo(() => {
        if (!searchTerm) return redemptions;
        const low = searchTerm.toLowerCase();
        return redemptions.filter(r => 
            r.id.toString().includes(low) || 
            r.userName?.toLowerCase().includes(low) || 
            r.rewardName.toLowerCase().includes(low)
        );
    }, [redemptions, searchTerm]);

    const handleProactiveSync = async () => {
        if (!window.confirm("Aplikasi akan menarik data terbaru dari AppSheet dan memperbarui database lokal jika ada perbedaan. Lanjutkan?")) return;
        
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

    const handleExportAppSheet = () => {
        const headers = ['Tanggal','Long - Lat','TAP','Surveyor','Nama Surveyor','ID Digipos','Nama Outlet','Hadiah','ID Redeem','Penerima Hadiah','Nama Penerima','Photo Dokumentasi'];
        const rows = filteredRedemptions.map(r => {
            const d = new Date(r.date);
            return [
                `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`,
                '', r.userTap || '-', 'Salesforce', '', r.userId, `"${r.userName}"`, `"${r.rewardName}"`, r.id, '', '', ''
            ].join(',');
        });
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `template_appsheet_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-700">Penukaran Hadiah</h1>
                <div className="flex gap-2">
                    <button 
                        onClick={handleProactiveSync} 
                        disabled={isSyncing}
                        className={`neu-button !w-auto px-4 flex items-center gap-2 ${isSyncing ? 'opacity-50' : 'bg-blue-600 text-white shadow-md'}`}
                    >
                        <Icon path={ICONS.history} className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`}/>
                        {isSyncing ? 'Menyinkronkan...' : 'Sinkronisasi Dua Arah'}
                    </button>
                    <button onClick={handleExportAppSheet} className="neu-button !w-auto px-4 flex items-center gap-2 bg-green-600 text-white">
                        <Icon path={ICONS.simCard} className="w-5 h-5"/>Template AppSheet
                    </button>
                </div>
            </div>

            <div className="neu-card-flat p-4">
                <input 
                    type="text" 
                    placeholder="Cari ID Redeem atau Nama Mitra..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="input-field"
                />
            </div>

            <div className="neu-card-flat overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-200">
                        <tr>
                            <th className="p-4">ID Redeem</th>
                            <th className="p-4">Nama Mitra</th>
                            <th className="p-4">Hadiah</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-center">Foto</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRedemptions.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage).map((item) => (
                            <tr key={item.id} className="border-t border-slate-200/80">
                                <td className="p-4 font-mono font-bold text-red-600">{item.id}</td>
                                <td className="p-4">{item.userName}</td>
                                <td className="p-4 font-semibold">{item.rewardName}</td>
                                <td className="p-4">
                                    <span className={`font-bold ${item.status === 'Selesai' ? 'text-green-600' : 'text-amber-600'}`}>
                                        {item.status || 'Diajukan'}
                                    </span>
                                </td>
                                <td className="p-4 text-center">
                                    {item.documentationPhotoUrl ? (
                                        <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center mx-auto text-green-600">
                                            <Icon path={ICONS.camera} className="w-4 h-4"/>
                                        </div>
                                    ) : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination 
                itemsPerPage={itemsPerPage} 
                totalItems={filteredRedemptions.length} 
                paginate={setCurrentPage} 
                currentPage={currentPage} 
            />
        </div>
    );
};

export default ManajemenPenukaran;
