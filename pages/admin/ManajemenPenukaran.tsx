import React, { useState, useMemo } from 'react';
import { Redemption } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';

interface ManajemenPenukaranProps {
    redemptions: Redemption[];
    isReadOnly?: boolean;
}

const ManajemenPenukaran: React.FC<ManajemenPenukaranProps> = ({ redemptions, isReadOnly }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState({ from: '', to: '' });

    const filteredRedemptions = useMemo(() => {
        return redemptions.filter(item => {
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
                    item.userId.toLowerCase().includes(lowercasedSearchTerm)
                );
            }
            
            return true;
        });
    }, [redemptions, filter, searchTerm]);
    
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilter(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleResetFilters = () => {
        setFilter({ from: '', to: '' });
        setSearchTerm('');
    };

    const handleExport = () => {
        if (filteredRedemptions.length === 0) {
            alert("Tidak ada data untuk diekspor dengan filter yang dipilih.");
            return;
        }
    
        const csvHeader = ['Tanggal', 'ID Mitra', 'Nama Mitra', 'Hadiah', 'Poin Dihabiskan'].join(',');
        
        const csvRows = filteredRedemptions.map(r => {
            const cleanRewardName = `"${(r.rewardName || 'N/A').replace(/"/g, '""')}"`;
            const cleanUserName = `"${(r.userName || 'N/A').replace(/"/g, '""')}"`;
            const formattedDate = new Date(r.date).toLocaleString('id-ID', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            }).replace(/\./g, ':');

            return [
                formattedDate,
                r.userId,
                cleanUserName,
                cleanRewardName,
                r.pointsSpent
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
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-700">Riwayat Penukaran Poin Mitra</h1>
                <button onClick={handleExport} className="neu-button !w-auto px-4 flex items-center gap-2">
                    <Icon path={ICONS.download} className="w-5 h-5"/>Ekspor Excel
                </button>
            </div>
            
            <div className="mb-6 neu-card-flat p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                <input
                    type="text"
                    placeholder="Cari nama atau ID..."
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

            <div className="neu-card-flat overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-200/50">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600 whitespace-nowrap">Tanggal</th>
                            <th className="p-4 font-semibold text-gray-600 w-full">Nama Mitra</th>
                            <th className="p-4 font-semibold text-gray-600 w-full">Hadiah</th>
                            <th className="p-4 font-semibold text-gray-600 text-right whitespace-nowrap">Poin Digunakan</th>
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
                                <td className="p-4 font-semibold">{item.rewardName}</td>
                                <td className="p-4 font-bold text-right text-red-600 whitespace-nowrap">{item.pointsSpent.toLocaleString('id-ID')}</td>
                            </tr>
                        )) : (
                             <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-500">Tidak ada riwayat penukaran yang cocok.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ManajemenPenukaran;