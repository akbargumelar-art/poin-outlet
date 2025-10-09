
import React, { useState, useMemo } from 'react';
import { Transaction, User } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';

interface ManajemenTransaksiProps {
    transactions: Transaction[];
    users: User[];
}

const ManajemenTransaksi: React.FC<ManajemenTransaksiProps> = ({ transactions, users }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [produkFilter, setProdukFilter] = useState('');
    const [filter, setFilter] = useState({ from: '', to: '' });

    const transactionsWithUserData = useMemo(() => {
        return transactions.map(t => {
            const user = users.find(u => u.id === t.userId);
            return {
                ...t,
                userName: user?.profile.nama || 'N/A',
                userTap: user?.profile.tap || '-',
                userSalesforce: user?.profile.salesforce || '-'
            };
        });
    }, [transactions, users]);

    const uniqueProduk = useMemo(() => {
        return [...new Set(transactionsWithUserData.map(t => t.produk))].sort();
    }, [transactionsWithUserData]);

    const filteredTransactions = useMemo(() => {
        return transactionsWithUserData.filter(item => {
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
    }, [transactionsWithUserData, filter, searchTerm, produkFilter]);
    
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilter(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleResetFilters = () => {
        setFilter({ from: '', to: '' });
        setSearchTerm('');
        setProdukFilter('');
    };

    const handleExport = () => {
        if (filteredTransactions.length === 0) {
            alert("Tidak ada data untuk diekspor dengan filter yang dipilih.");
            return;
        }
    
        const csvHeader = ['Tanggal', 'ID Mitra', 'Nama Mitra', 'TAP', 'Salesforce', 'Produk', 'Harga Satuan', 'Kuantiti', 'Total Pembelian', 'Poin Didapat'].join(',');
        
        const csvRows = filteredTransactions.map(t => {
            const formattedDate = new Date(t.date).toLocaleString('id-ID', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            }).replace(/\./g, ':');

            return [
                formattedDate,
                t.userId,
                `"${t.userName.replace(/"/g, '""')}"`,
                t.userTap,
                t.userSalesforce,
                `"${t.produk.replace(/"/g, '""')}"`,
                t.harga,
                t.kuantiti,
                t.totalPembelian,
                t.pointsEarned
            ].join(',');
        });
    
        const csv = [csvHeader, ...csvRows].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'riwayat_transaksi.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div>
            <div>
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-700">Riwayat Transaksi Pembelian</h1>
                    <button onClick={handleExport} className="neu-button !w-auto px-4 flex items-center gap-2">
                        <Icon path={ICONS.download} className="w-5 h-5"/>Ekspor Excel
                    </button>
                </div>
                
                <div className="mb-6 neu-card-flat p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-center">
                    <input
                        type="text"
                        placeholder="Cari nama, ID, produk..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field lg:col-span-2"
                    />
                     <select
                        value={produkFilter}
                        onChange={(e) => setProdukFilter(e.target.value)}
                        className="input-field lg:col-span-2"
                    >
                        <option value="">Semua Produk</option>
                        {uniqueProduk.map(produk => (
                            <option key={produk} value={produk}>{produk}</option>
                        ))}
                    </select>
                    <div className="flex items-center gap-2 lg:col-span-2">
                        <input type="date" name="from" value={filter.from} onChange={handleFilterChange} className="input-field !w-auto text-sm" />
                        <span className="text-gray-500">-</span>
                        <input type="date" name="to" value={filter.to} onChange={handleFilterChange} className="input-field !w-auto text-sm" />
                        <button onClick={handleResetFilters} className="neu-button-icon !p-2" title="Clear Filter">
                            <Icon path={ICONS.close} className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="neu-card-flat overflow-hidden">
                <div className="overflow-auto max-h-[60vh]">
                    <table className="w-full min-w-max text-left">
                        <thead className="bg-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600 whitespace-nowrap">Tanggal</th>
                                <th className="p-4 font-semibold text-gray-600">Nama Mitra</th>
                                <th className="p-4 font-semibold text-gray-600">Produk</th>
                                <th className="p-4 font-semibold text-gray-600 text-right whitespace-nowrap">Harga Satuan</th>
                                <th className="p-4 font-semibold text-gray-600 text-right whitespace-nowrap">Kuantiti</th>
                                <th className="p-4 font-semibold text-gray-600 text-right whitespace-nowrap">Total</th>
                                <th className="p-4 font-semibold text-gray-600 text-right whitespace-nowrap">Poin</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.length > 0 ? filteredTransactions.map((item) => (
                                <tr key={item.id} className="border-t border-slate-200/80">
                                    <td className="p-4 whitespace-nowrap">{new Date(item.date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                    <td className="p-4">
                                        <p className="font-semibold text-gray-800">{item.userName}</p>
                                        <p className="text-xs text-gray-500 font-mono">{item.userId}</p>
                                    </td>
                                    <td className="p-4 font-semibold">{item.produk}</td>
                                    <td className="p-4 text-right whitespace-nowrap">Rp {item.harga.toLocaleString('id-ID')}</td>
                                    <td className="p-4 text-right whitespace-nowrap">{item.kuantiti.toLocaleString('id-ID')}</td>
                                    <td className="p-4 text-right whitespace-nowrap">Rp {item.totalPembelian.toLocaleString('id-ID')}</td>
                                    <td className="p-4 font-bold text-right text-green-600 whitespace-nowrap">+{item.pointsEarned.toLocaleString('id-ID')}</td>
                                </tr>
                            )) : (
                                 <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500">Tidak ada riwayat transaksi yang cocok.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManajemenTransaksi;
