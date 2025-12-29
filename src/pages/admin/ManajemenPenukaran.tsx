
import React, { useState, useMemo, useEffect } from 'react';
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
    // ... existing state

    const handleProactiveSync = async () => {
        if (!window.confirm("Aplikasi akan mengecek perbedaan data di AppSheet dan memperbarui database Web otomatis. Lanjutkan?")) return;
        
        setIsSyncing(true);
        try {
            const response = await axios.post('/api/integration/appsheet/sync-all');
            alert(response.data.message);
            // Refresh data bisa dilakukan dengan memanggil ulang bootstrap (via props atau window location)
            window.location.reload(); 
        } catch (error: any) {
            alert("Gagal Sinkronisasi: " + (error.response?.data?.message || error.message));
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div>
            {/* Modals... */}
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-700">Penukaran Hadiah</h1>
                <div className="flex gap-2">
                    <button 
                        onClick={handleProactiveSync} 
                        disabled={isSyncing}
                        className={`neu-button !w-auto px-4 flex items-center gap-2 ${isSyncing ? 'opacity-50' : 'bg-blue-600 text-white shadow-md'}`}
                    >
                        <Icon path={ICONS.history} className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`}/>
                        {isSyncing ? 'Mengecek Data...' : 'Sinkronisasi Dua Arah'}
                    </button>
                    <button onClick={() => {}} className="neu-button !w-auto px-4 flex items-center gap-2 bg-green-600 text-white shadow-md">
                        <Icon path={ICONS.simCard} className="w-5 h-5"/>Template AppSheet
                    </button>
                </div>
            </div>

            {/* Sisa UI Tabel... */}
            <div className="neu-card-flat overflow-hidden">
                <div className="overflow-auto min-h-[400px]">
                    <table className="w-full min-w-max text-left text-sm">
                        <thead className="bg-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600">ID Redeem</th>
                                <th className="p-4 font-semibold text-gray-600">Nama Mitra</th>
                                <th className="p-4 font-semibold text-gray-600">Status</th>
                                <th className="p-4 font-semibold text-gray-600">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {redemptions.map((item) => (
                                <tr key={item.id} className="border-t border-slate-200/80">
                                    <td className="p-4 font-mono font-bold text-red-600">{item.id}</td>
                                    <td className="p-4">{item.userName}</td>
                                    <td className="p-4">
                                        <span className={`font-bold ${item.status === 'Selesai' ? 'text-green-600' : 'text-amber-600'}`}>
                                            {item.status || 'Diajukan'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <button onClick={() => {}} className="neu-button-icon text-purple-600"><Icon path={ICONS.eye} className="w-5 h-5"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManajemenPenukaran;
