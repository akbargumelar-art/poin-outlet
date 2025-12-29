
import React, { useState, useMemo, useEffect } from 'react';
// Fix: Menggunakan jalur import yang benar untuk mencapai root dari direktori src/pages/admin/
import { Transaction, User } from '../../../types';
import Icon from '../../../components/common/Icon';
import { ICONS } from '../../../constants';
import Pagination from '../../../components/common/Pagination';

type SortableKeys = 'date' | 'userName' | 'produk' | 'harga' | 'kuantiti' | 'totalPembelian' | 'pointsEarned';

interface ManajemenTransaksiProps {
    transactions: Transaction[];
    users: User[];
}

const ManajemenTransaksi: React.FC<ManajemenTransaksiProps> = ({ transactions, users }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [produkFilter, setProdukFilter] = useState('');
    const [filter, setFilter] = useState({ from: '', to: '' });
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });
    
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

    const SummaryCard = ({ title, value, subtext, colorClass, icon }: { title: string, value: string, subtext?: string, colorClass: string, icon: string }) => (
        <div className="neu-card p-4 flex items-center justify-between">
            <div className="flex-grow min-w-0 pr-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide truncate">{title}</p>
                <p className={`text-xl font-bold mt-1 truncate ${colorClass}`} title={value}>{value}</p>
                {subtext && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtext}</p>}
            </div>
            <div className={`p-2 rounded-full flex-shrink-0 ${colorClass.replace('text-', 'bg-').replace('600', '100').replace('700', '100')}`}>
                <Icon path={icon} className={`w-6 h-6 ${colorClass}`} />
            </div>
        </div>
    );

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilter(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleResetFilters = () => {
        setFilter({ from: '', to: '' });
        setSearchTerm('');
        setProdukFilter('');
    };

    const userMap = useMemo(() => {
        return new Map(users.map(u => [u.id, u]));
    }, [users]);

    const transactionsWithUserData = useMemo(() => {
        return transactions.map(t => {
            const user = userMap.get(t.userId);
            return {
                ...t,
                userName: user?.profile.nama || 'N/A',
                userTap: user?.profile.tap || '-',
                userSalesforce: user?.profile.salesforce || '-'
            };
        });
    }, [transactions, userMap]);

    const uniqueProduk = useMemo(() => {
        return [...new Set(transactionsWithUserData.map(t => t.produk))].sort();
    }, [transactionsWithUserData]);

    const filteredTransactions = useMemo(() => {
        let filtered = transactionsWithUserData.filter(item => {
            const itemDate = new Date(item.date);
            const fromDate = filter.from ? new Date(filter.from) : null;
            const toDate = filter.to ? new Date(filter.to) : null;
            
            if(fromDate) fromDate.setHours(0,0,0,0);
            if(toDate) toDate.setHours(23,59,59,999);

            if (fromDate && itemDate < fromDate) return false;
            if (toDate && itemDate > toDate) return false;

            if (produkFilter && item.produk !== produkFilter) {
                return false;
            }

            const lowercasedSearchTerm = searchTerm.trim().toLowerCase();
            if (lowercasedSearchTerm) {
                const matchesSearch = 
                    item.userName.toLowerCase().includes(lowercasedSearchTerm) ||
                    item.userId.toLowerCase().includes(lowercasedSearchTerm) ||
                    item.produk.toLowerCase().includes(lowercasedSearchTerm);
                if (!matchesSearch) {
                    return false;
                }
            }
            
            return true;
        });

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                
                let comparison = 0;
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    if (sortConfig.key === 'date') {
                        comparison = new Date(aValue).getTime() - new Date(bValue).getTime();
                    } else {
                        comparison = aValue.localeCompare(bValue);
                    }
                } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                    comparison = Number(aValue) - Number(bValue);
                }
                
                return sortConfig.direction === 'asc' ? comparison : -comparison;
            });
        }
        
        return filtered;

    }, [transactionsWithUserData, filter, searchTerm, produkFilter, sortConfig]);
    
    const summaryStats = useMemo(() => {
        let totalRevenue = 0;
        let totalPoints = 0;
        const uniquePartners = new Set<string>();
        const productSales: Record<string, number> = {};

        filteredTransactions.forEach(t => {
            totalRevenue += Number(t.totalPembelian) || 0;
            totalPoints += Number(t.pointsEarned) || 0;
            uniquePartners.add(t.userId);
            productSales[t.produk] = (productSales[t.produk] || 0) + (Number(t.kuantiti) || 0);
        });

        let bestSeller = '-';
        let maxQty = 0;
        Object.entries(productSales).forEach(([name, qty]) => {
            if (qty > maxQty) {
                maxQty = qty;
                bestSeller = name;
            }
        });

        return {
            totalRevenue,
            totalTransactions: filteredTransactions.length,
            uniquePartners: uniquePartners.size,
            totalPoints,
            bestSeller,
            bestSellerQty: maxQty
        };
    }, [filteredTransactions]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, produkFilter, filter]);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    const requestSort = (key: SortableKeys) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortableKeys) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <Icon path={ICONS.sortNeutral} className="w-4 h-4 text-gray-400" />;
        }
        if (sortConfig.direction === 'asc') {
            return <Icon path={ICONS.sortUp} className="w-4 h-4 text-gray-800" />;
        }
        return <Icon path={ICONS.sortDown} className="w-4 h-4 text-gray-800" />;
    };

    const handleExport = () => {
        if (filteredTransactions.length === 0) {
            alert("Tidak ada data untuk diekspor.");
            return;
        }
        const headers = ['Tanggal', 'ID Mitra', 'Nama Mitra', 'TAP', 'Produk', 'Harga', 'Kuantiti', 'Total', 'Poin'];
        const rows = filteredTransactions.map(t => [
            t.date, t.userId, `"${t.userName.replace(/"/g, '""')}"`, t.userTap, `"${t.produk.replace(/"/g, '""')}"`, t.harga, t.kuantiti, t.totalPembelian, t.pointsEarned
        ].join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'riwayat_transaksi.csv';
        link.click();
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-700">Riwayat Transaksi Pembelian</h1>
                <button onClick={() => handleExport()} className="neu-button !w-auto px-4 flex items-center gap-2">
                    <Icon path={ICONS.download} className="w-5 h-5"/>Ekspor Excel
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <SummaryCard title="Total Omzet" value={`Rp ${summaryStats.totalRevenue.toLocaleString('id-ID')}`} colorClass="text-green-600" icon={ICONS.history} />
                <SummaryCard title="Total Transaksi" value={summaryStats.totalTransactions.toString()} colorClass="text-blue-600" icon={ICONS.dashboard} />
                <SummaryCard title="Mitra Aktif" value={summaryStats.uniquePartners.toString()} colorClass="text-purple-600" icon={ICONS.users} />
                <SummaryCard title="Best Seller" value={summaryStats.bestSeller} subtext={`${summaryStats.bestSellerQty} unit`} colorClass="text-amber-600" icon={ICONS.ticket} />
                <SummaryCard title="Poin Keluar" value={summaryStats.totalPoints.toString()} colorClass="text-red-600" icon={ICONS.gift} />
            </div>

            <div className="mb-6 neu-card-flat p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-center">
                <input type="text" placeholder="Cari mitra atau produk..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field lg:col-span-2" />
                <select value={produkFilter} onChange={(e) => setProdukFilter(e.target.value)} className="input-field lg:col-span-2">
                    <option value="">Semua Produk</option>
                    {uniqueProduk.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <div className="flex items-center gap-2 lg:col-span-2">
                    <input type="date" name="from" value={filter.from} onChange={handleFilterChange} className="input-field !w-auto text-sm" />
                    <input type="date" name="to" value={filter.to} onChange={handleFilterChange} className="input-field !w-auto text-sm" />
                    <button onClick={handleResetFilters} className="neu-button-icon !p-2"><Icon path={ICONS.close} className="w-5 h-5" /></button>
                </div>
            </div>
            
            <div className="neu-card-flat overflow-hidden">
                <div className="overflow-auto min-h-[400px]">
                    <table className="w-full min-w-max text-left">
                        <thead className="bg-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600"><button onClick={() => requestSort('date')} className="flex items-center gap-1">Tanggal {getSortIcon('date')}</button></th>
                                <th className="p-4 font-semibold text-gray-600"><button onClick={() => requestSort('userName')} className="flex items-center gap-1">Mitra {getSortIcon('userName')}</button></th>
                                <th className="p-4 font-semibold text-gray-600"><button onClick={() => requestSort('produk')} className="flex items-center gap-1">Produk {getSortIcon('produk')}</button></th>
                                <th className="p-4 font-semibold text-gray-600 text-right"><button onClick={() => requestSort('totalPembelian')} className="flex items-center gap-1 justify-end w-full">Total {getSortIcon('totalPembelian')}</button></th>
                                <th className="p-4 font-semibold text-gray-600 text-right"><button onClick={() => requestSort('pointsEarned')} className="flex items-center gap-1 justify-end w-full">Poin {getSortIcon('pointsEarned')}</button></th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.map((item) => (
                                <tr key={item.id} className="border-t border-slate-200/80">
                                    <td className="p-4 whitespace-nowrap">{new Date(item.date).toLocaleDateString('id-ID')}</td>
                                    <td className="p-4"><div><p className="font-semibold">{item.userName}</p><p className="text-xs text-gray-500 font-mono">{item.userId}</p></div></td>
                                    <td className="p-4 font-semibold">{item.produk}</td>
                                    <td className="p-4 text-right">Rp {Number(item.totalPembelian).toLocaleString('id-ID')}</td>
                                    <td className="p-4 font-bold text-right text-green-600">+{item.pointsEarned.toLocaleString('id-ID')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <Pagination itemsPerPage={itemsPerPage} totalItems={filteredTransactions.length} paginate={paginate} currentPage={currentPage} />
        </div>
    );
};

export default ManajemenTransaksi;