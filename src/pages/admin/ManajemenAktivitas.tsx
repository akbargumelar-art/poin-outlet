
import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Redemption, User } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import Pagination from '../../components/common/Pagination';

interface ManajemenAktivitasProps {
    transactions: Transaction[];
    redemptions: Redemption[];
    users: User[];
}

type CombinedItem = {
    id: string; // Unique ID for key (TX-1 or RD-1)
    originalId: number;
    date: string;
    type: 'Transaksi' | 'Penukaran';
    userId: string;
    userName: string;
    userTap: string;
    userSalesforce: string;
    description: string; // Produk or Hadiah
    amountOrCost: number; // Rupiah for TX, Points for RD
    pointsChange: number; // + for TX, - for RD
    status: string; // 'Sukses' for TX, or Redemption Status
    note?: string;
};

const ManajemenAktivitas: React.FC<ManajemenAktivitasProps> = ({ transactions, redemptions, users }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'All' | 'Transaksi' | 'Penukaran'>('All');
    const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

    const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

    // 1. Merge and Normalize Data
    const combinedData = useMemo(() => {
        const txItems: CombinedItem[] = transactions.map(t => {
            const user = userMap.get(t.userId);
            return {
                id: `TX-${t.id}`,
                originalId: t.id,
                date: t.date,
                type: 'Transaksi',
                userId: t.userId,
                userName: user?.profile.nama || 'N/A',
                userTap: user?.profile.tap || '-',
                userSalesforce: user?.profile.salesforce || '-',
                description: `${t.produk} (${t.kuantiti}x)`,
                amountOrCost: t.totalPembelian,
                pointsChange: t.pointsEarned,
                status: 'Sukses',
                note: `Harga: Rp ${t.harga.toLocaleString('id-ID')}`
            };
        });

        const rdItems: CombinedItem[] = redemptions.map(r => {
            const user = userMap.get(r.userId);
            return {
                id: `RD-${r.id}`,
                originalId: r.id,
                date: r.date,
                type: 'Penukaran',
                userId: r.userId,
                userName: user?.profile.nama || r.userName || 'N/A',
                userTap: user?.profile.tap || '-',
                userSalesforce: user?.profile.salesforce || '-',
                description: r.rewardName,
                amountOrCost: 0,
                pointsChange: -r.pointsSpent,
                status: r.status || 'Diajukan',
                note: r.statusNote
            };
        });

        return [...txItems, ...rdItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, redemptions, userMap]);

    // 2. Filter Data
    const filteredData = useMemo(() => {
        return combinedData.filter(item => {
            // Type Filter
            if (filterType !== 'All' && item.type !== filterType) return false;

            // Date Filter
            const itemDate = new Date(item.date);
            const fromDate = dateFilter.from ? new Date(dateFilter.from) : null;
            const toDate = dateFilter.to ? new Date(dateFilter.to) : null;
            if (fromDate) fromDate.setHours(0,0,0,0);
            if (toDate) toDate.setHours(23,59,59,999);

            if (fromDate && itemDate < fromDate) return false;
            if (toDate && itemDate > toDate) return false;

            // Search Term
            if (searchTerm.trim()) {
                const lower = searchTerm.toLowerCase();
                const matches = 
                    item.userName.toLowerCase().includes(lower) ||
                    item.userId.toLowerCase().includes(lower) ||
                    item.description.toLowerCase().includes(lower) ||
                    item.userTap.toLowerCase().includes(lower);
                if (!matches) return false;
            }

            return true;
        });
    }, [combinedData, searchTerm, filterType, dateFilter]);

    // 3. Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, filterType, dateFilter]);

    const handleResetFilters = () => {
        setSearchTerm('');
        setFilterType('All');
        setDateFilter({ from: '', to: '' });
    };

    const handleExport = () => {
        if (filteredData.length === 0) {
            alert("Tidak ada data untuk diekspor.");
            return;
        }
        const headers = ['Tanggal', 'Waktu', 'ID Mitra', 'Nama Mitra', 'TAP', 'Tipe', 'Deskripsi', 'Nominal (Rp)', 'Poin (+/-)', 'Status', 'Catatan'];
        const rows = filteredData.map(item => {
            const d = new Date(item.date);
            return [
                d.toLocaleDateString('id-ID'),
                d.toLocaleTimeString('id-ID'),
                item.userId,
                `"${item.userName.replace(/"/g, '""')}"`,
                item.userTap,
                item.type,
                `"${item.description.replace(/"/g, '""')}"`,
                item.type === 'Transaksi' ? item.amountOrCost : 0,
                item.pointsChange,
                item.status,
                `"${(item.note || '').replace(/"/g, '""')}"`
            ].join(',');
        });
        
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `riwayat_aktivitas_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
    };

    const getStatusColor = (status: string, type: string) => {
        if (type === 'Transaksi') return 'text-green-700 bg-green-100';
        switch (status) {
            case 'Diajukan': return 'text-blue-700 bg-blue-100';
            case 'Diproses': return 'text-amber-700 bg-amber-100';
            case 'Selesai': return 'text-green-700 bg-green-100';
            case 'Ditolak': return 'text-red-700 bg-red-100';
            default: return 'text-gray-700 bg-gray-100';
        }
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-700">Riwayat Gabungan Aktivitas</h1>
                <button onClick={handleExport} className="neu-button !w-auto px-4 flex items-center gap-2">
                    <Icon path={ICONS.download} className="w-5 h-5"/> Ekspor Excel
                </button>
            </div>

            {/* Filters */}
            <div className="neu-card-flat p-4 mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="w-full">
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Cari Mitra / Produk</label>
                    <input 
                        type="text" 
                        placeholder="Nama, ID, atau Produk..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="input-field"
                    />
                </div>
                <div className="w-full">
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Tipe Aktivitas</label>
                    <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="input-field">
                        <option value="All">Semua</option>
                        <option value="Transaksi">Transaksi (Poin Masuk)</option>
                        <option value="Penukaran">Penukaran (Poin Keluar)</option>
                    </select>
                </div>
                <div className="w-full">
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Rentang Tanggal</label>
                    <div className="flex gap-2">
                        <input type="date" value={dateFilter.from} onChange={e => setDateFilter(prev => ({...prev, from: e.target.value}))} className="input-field text-sm" />
                        <input type="date" value={dateFilter.to} onChange={e => setDateFilter(prev => ({...prev, to: e.target.value}))} className="input-field text-sm" />
                    </div>
                </div>
                <div>
                    <button onClick={handleResetFilters} className="neu-button bg-gray-200 text-gray-600 hover:bg-gray-300">Reset Filter</button>
                </div>
            </div>

            {/* Data Table */}
            <div className="neu-card-flat overflow-hidden">
                <div className="overflow-auto min-h-[400px]">
                    <table className="w-full min-w-max text-left text-sm">
                        <thead className="bg-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 font-semibold text-gray-700">Waktu</th>
                                <th className="p-4 font-semibold text-gray-700">Mitra Outlet</th>
                                <th className="p-4 font-semibold text-gray-700">Aktivitas</th>
                                <th className="p-4 font-semibold text-gray-700">Deskripsi</th>
                                <th className="p-4 font-semibold text-gray-700 text-right">Nilai / Poin</th>
                                <th className="p-4 font-semibold text-gray-700 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.length > 0 ? currentItems.map(item => (
                                <tr key={item.id} className="border-t border-slate-200/80 hover:bg-slate-50">
                                    <td className="p-4 whitespace-nowrap text-gray-600">
                                        <div className="font-bold">{new Date(item.date).toLocaleDateString('id-ID')}</div>
                                        <div className="text-xs">{new Date(item.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-gray-800">{item.userName}</div>
                                        <div className="text-xs text-gray-500 font-mono">{item.userId} | {item.userTap}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.type === 'Transaksi' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-purple-50 text-purple-600 border border-purple-200'}`}>
                                            {item.type}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-semibold text-gray-700">{item.description}</div>
                                        {item.note && <div className="text-xs text-gray-500 italic mt-1">{item.note}</div>}
                                    </td>
                                    <td className="p-4 text-right whitespace-nowrap">
                                        {item.type === 'Transaksi' && (
                                            <div className="text-xs text-gray-500 mb-1">Rp {item.amountOrCost.toLocaleString('id-ID')}</div>
                                        )}
                                        <div className={`font-bold text-lg ${item.pointsChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {item.pointsChange > 0 ? '+' : ''}{item.pointsChange.toLocaleString('id-ID')}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(item.status, item.type)}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">Tidak ada riwayat aktivitas yang ditemukan.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Pagination 
                itemsPerPage={itemsPerPage} 
                totalItems={filteredData.length} 
                paginate={pageNumber => setCurrentPage(pageNumber)} 
                currentPage={currentPage} 
            />
        </div>
    );
};

export default ManajemenAktivitas;
