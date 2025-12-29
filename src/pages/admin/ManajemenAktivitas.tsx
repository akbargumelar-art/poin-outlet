
import React, { useState, useMemo, useEffect } from 'react';
// Fix: Menggunakan jalur import yang benar untuk mencapai root dari direktori src/pages/admin/
import { Transaction, Redemption, User } from '../../../types';
import Icon from '../../../components/common/Icon';
import { ICONS } from '../../../constants';
import Pagination from '../../../components/common/Pagination';

interface ManajemenAktivitasProps {
    transactions: Transaction[];
    redemptions: Redemption[];
    users: User[];
}

type CombinedItem = {
    id: string; 
    originalId: number;
    date: string;
    type: 'Transaksi' | 'Penukaran';
    userId: string;
    userName: string;
    userTap: string;
    userSalesforce: string;
    description: string;
    amountOrCost: number;
    pointsChange: number;
    status: string;
    note?: string;
};

const ManajemenAktivitas: React.FC<ManajemenAktivitasProps> = ({ transactions, redemptions, users }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'All' | 'Transaksi' | 'Penukaran'>('All');
    const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
    
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

    const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

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

    const filteredData = useMemo(() => {
        return combinedData.filter(item => {
            if (filterType !== 'All' && item.type !== filterType) return false;
            const itemDate = new Date(item.date);
            const fromDate = dateFilter.from ? new Date(dateFilter.from) : null;
            const toDate = dateFilter.to ? new Date(dateFilter.to) : null;
            if (fromDate) fromDate.setHours(0,0,0,0);
            if (toDate) toDate.setHours(23,59,59,999);
            if (fromDate && itemDate < fromDate) return false;
            if (toDate && itemDate > toDate) return false;
            if (searchTerm.trim()) {
                const lower = searchTerm.toLowerCase();
                return item.userName.toLowerCase().includes(lower) || item.userId.toLowerCase().includes(lower) || item.description.toLowerCase().includes(lower);
            }
            return true;
        });
    }, [combinedData, searchTerm, filterType, dateFilter]);

    const currentItems = filteredData.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, filterType, dateFilter]);

    const handleResetFilters = () => {
        setSearchTerm('');
        setFilterType('All');
        setDateFilter({ from: '', to: '' });
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-700">Riwayat Aktivitas</h1>
            </div>

            <div className="neu-card-flat p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <input type="text" placeholder="Cari..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-field" />
                <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="input-field">
                    <option value="All">Semua</option>
                    <option value="Transaksi">Transaksi</option>
                    <option value="Penukaran">Penukaran</option>
                </select>
                <input type="date" value={dateFilter.from} onChange={e => setDateFilter(p => ({...p, from: e.target.value}))} className="input-field" />
                <button onClick={handleResetFilters} className="neu-button">Reset</button>
            </div>

            <div className="neu-card-flat overflow-hidden">
                <div className="overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-200">
                            <tr>
                                <th className="p-4">Waktu</th>
                                <th className="p-4">Mitra</th>
                                <th className="p-4">Aktivitas</th>
                                <th className="p-4">Deskripsi</th>
                                <th className="p-4 text-right">Poin</th>
                                <th className="p-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.map(item => (
                                <tr key={item.id} className="border-t border-slate-200/80">
                                    <td className="p-4">{new Date(item.date).toLocaleDateString('id-ID')}</td>
                                    <td className="p-4"><div><p className="font-bold">{item.userName}</p><p className="text-xs text-gray-500">{item.userId}</p></div></td>
                                    <td className="p-4"><span className={`px-2 py-1 rounded-full font-bold text-[10px] ${item.type === 'Transaksi' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>{item.type}</span></td>
                                    <td className="p-4">{item.description}</td>
                                    <td className={`p-4 text-right font-bold ${item.pointsChange > 0 ? 'text-green-600' : 'text-red-600'}`}>{item.pointsChange > 0 ? '+' : ''}{item.pointsChange.toLocaleString('id-ID')}</td>
                                    <td className="p-4 text-center">{item.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <Pagination itemsPerPage={itemsPerPage} totalItems={filteredData.length} paginate={setCurrentPage} currentPage={currentPage} />
        </div>
    );
};

export default ManajemenAktivitas;