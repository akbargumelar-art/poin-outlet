
import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, User } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import Pagination from '../../components/common/Pagination';

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
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

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
                    comparison = aValue - bValue;
                }
                
                return sortConfig.direction === 'asc' ? comparison : -comparison;
            });
        }
        
        return filtered;

    }, [transactionsWithUserData, filter, searchTerm, produkFilter, sortConfig]);
    
    // --- Summary Calculations ---
    const summaryStats = useMemo(() => {
        let totalRevenue = 0;
        let totalPoints = 0;
        const uniquePartners = new Set<string>();
        const productSales: Record<string, number> = {};

        filteredTransactions.forEach(t => {
            totalRevenue += Number(t.totalPembelian || 0);
            totalPoints += Number(t.pointsEarned || 0);
            uniquePartners.add(t.userId);

            const prodName = t.produk || 'Unknown';
            // Aggregate quantity for best seller logic
            productSales[prodName] = (productSales[prodName] || 0) + Number(t.kuantiti || 0);
        });

        // Find Best Seller
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

    // --- Chart Data Calculation (Daily Stacked Bar) ---
    const chartData = useMemo(() => {
        if (filteredTransactions.length === 0) return null;

        // 1. Identify Top 5 Products by Total Revenue in this period
        const productRevenue: Record<string, number> = {};
        filteredTransactions.forEach(t => {
            productRevenue[t.produk] = (productRevenue[t.produk] || 0) + t.totalPembelian;
        });
        
        const topProducts = Object.entries(productRevenue)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(entry => entry[0]);

        // 2. Colors for Top Products
        const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
        const productColors: Record<string, string> = {};
        topProducts.forEach((prod, index) => {
            productColors[prod] = colors[index];
        });
        const otherColor = '#94a3b8'; // Slate 400 for "Others"

        // 3. Group Data by Date
        const dailyGroups: Record<string, { total: number, breakdown: Record<string, number> }> = {};
        
        filteredTransactions.forEach(t => {
            const dateKey = new Date(t.date).toISOString().split('T')[0];
            if (!dailyGroups[dateKey]) {
                dailyGroups[dateKey] = { total: 0, breakdown: {} };
            }
            
            const revenue = t.totalPembelian;
            dailyGroups[dateKey].total += revenue;
            
            // Group into Top 5 or "Others"
            const key = topProducts.includes(t.produk) ? t.produk : 'Lainnya';
            dailyGroups[dateKey].breakdown[key] = (dailyGroups[dateKey].breakdown[key] || 0) + revenue;
        });

        // 4. Transform to sorted array
        const sortedDates = Object.keys(dailyGroups).sort();
        const data = sortedDates.map(date => ({
            date,
            displayDate: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
            total: dailyGroups[date].total,
            breakdown: dailyGroups[date].breakdown
        }));

        const maxTotal = Math.max(...data.map(d => d.total));

        return { data, topProducts, productColors, otherColor, maxTotal };
    }, [filteredTransactions]);


    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, produkFilter, filter]);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

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

    return (
        <div>
            <div>
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-700">Riwayat Transaksi Pembelian</h1>
                    <button onClick={handleExport} className="neu-button !w-auto px-4 flex items-center gap-2">
                        <Icon path={ICONS.download} className="w-5 h-5"/>Ekspor Excel
                    </button>
                </div>

                {/* Summary Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
                    <SummaryCard 
                        title="Total Omzet" 
                        value={`Rp ${summaryStats.totalRevenue.toLocaleString('id-ID', { compactDisplay: "short", notation: "compact" })}`} 
                        subtext="Dari data difilter"
                        colorClass="text-green-600" 
                        icon={ICONS.history} 
                    />
                    <SummaryCard 
                        title="Total Transaksi" 
                        value={summaryStats.totalTransactions.toLocaleString('id-ID')} 
                        subtext="Frekuensi"
                        colorClass="text-blue-600" 
                        icon={ICONS.dashboard} 
                    />
                    <SummaryCard 
                        title="Mitra Berbelanja" 
                        value={summaryStats.uniquePartners.toLocaleString('id-ID')} 
                        subtext="Mitra unik"
                        colorClass="text-purple-600" 
                        icon={ICONS.users} 
                    />
                    <SummaryCard 
                        title="Produk Terlaris" 
                        value={summaryStats.bestSeller} 
                        subtext={`${summaryStats.bestSellerQty} terjual`}
                        colorClass="text-amber-600" 
                        icon={ICONS.ticket} 
                    />
                    <SummaryCard 
                        title="Poin Diberikan" 
                        value={summaryStats.totalPoints.toLocaleString('id-ID', { compactDisplay: "short", notation: "compact" })} 
                        subtext="Total Reward"
                        colorClass="text-red-600" 
                        icon={ICONS.gift} 
                    />
                </div>

                {/* Daily Product Sales Chart */}
                {chartData && chartData.data.length > 0 && (
                    <div className="neu-card p-6 mb-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                                <Icon path={ICONS.store} className="w-5 h-5 text-red-500" />
                                Tren Penjualan Harian per Produk
                            </h2>
                            {/* Legend */}
                            <div className="flex flex-wrap gap-3 mt-2 md:mt-0">
                                {chartData.topProducts.map(prod => (
                                    <div key={prod} className="flex items-center gap-1 text-xs text-gray-600">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartData.productColors[prod] }}></div>
                                        <span>{prod}</span>
                                    </div>
                                ))}
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartData.otherColor }}></div>
                                    <span>Lainnya</span>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable Chart Container */}
                        <div className="w-full overflow-x-auto pb-2">
                            <div className="h-64 relative" style={{ minWidth: `${Math.max(100, chartData.data.length * 60)}px` }}>
                                <div className="absolute inset-0 flex items-end justify-between px-2 gap-2 sm:gap-4">
                                    {chartData.data.map((day, index) => {
                                        // Stack calculation
                                        let currentHeightPercent = 0;
                                        return (
                                            <div key={day.date} className="flex flex-col items-center justify-end h-full flex-1 group relative">
                                                {/* Tooltip Overlay */}
                                                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-gray-800 text-white text-xs rounded p-2 shadow-lg w-max max-w-[200px]">
                                                    <p className="font-bold mb-1 border-b border-gray-600 pb-1">{day.displayDate}</p>
                                                    <p className="font-bold">Total: Rp {day.total.toLocaleString('id-ID', { compactDisplay: 'short' })}</p>
                                                    <div className="mt-1 space-y-0.5">
                                                        {Object.entries(day.breakdown).sort((a,b)=>b[1]-a[1]).map(([prod, val]) => (
                                                            <div key={prod} className="flex justify-between gap-4">
                                                                <span className="opacity-80">{prod}:</span>
                                                                <span>{val.toLocaleString('id-ID', { compactDisplay: 'short' })}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Bars Stack */}
                                                <div className="w-full max-w-[40px] h-full flex flex-col-reverse justify-start rounded-t-md overflow-hidden bg-gray-100 relative">
                                                    {/* Draw Top Products */}
                                                    {chartData.topProducts.map(prod => {
                                                        const val = day.breakdown[prod] || 0;
                                                        if (val === 0) return null;
                                                        const height = (val / chartData.maxTotal) * 100;
                                                        currentHeightPercent += height;
                                                        return (
                                                            <div 
                                                                key={prod} 
                                                                style={{ height: `${height}%`, backgroundColor: chartData.productColors[prod] }}
                                                                className="w-full transition-all duration-300 hover:opacity-80"
                                                            ></div>
                                                        )
                                                    })}
                                                    {/* Draw Others */}
                                                    {day.breakdown['Lainnya'] > 0 && (
                                                        <div 
                                                            style={{ height: `${(day.breakdown['Lainnya'] / chartData.maxTotal) * 100}%`, backgroundColor: chartData.otherColor }}
                                                            className="w-full transition-all duration-300 hover:opacity-80"
                                                        ></div>
                                                    )}
                                                </div>
                                                
                                                {/* X-Axis Label */}
                                                <p className="text-[10px] text-gray-500 mt-2 font-medium whitespace-nowrap rotate-0 truncate w-full text-center">
                                                    {day.displayDate}
                                                </p>
                                            </div>
                                        )
                                    })}
                                </div>
                                {/* Y-Axis Grid Lines (Background) */}
                                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between text-[10px] text-gray-300 font-mono select-none">
                                    <div className="border-t border-gray-200 w-full relative"><span className="absolute -top-2 left-0 bg-white/50 px-1 text-gray-400">Rp {chartData.maxTotal.toLocaleString('id-ID', {compactDisplay: 'short'})}</span></div>
                                    <div className="border-t border-gray-100 w-full"></div>
                                    <div className="border-t border-gray-100 w-full"></div>
                                    <div className="border-t border-gray-100 w-full"></div>
                                    <div className="border-t border-gray-200 w-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
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
                <div className="overflow-auto min-h-[400px]">
                    <table className="w-full min-w-max text-left">
                        <thead className="bg-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600 whitespace-nowrap">
                                    <button onClick={() => requestSort('date')} className="flex items-center gap-1 hover:text-red-600 transition-colors">
                                        Tanggal {getSortIcon('date')}
                                    </button>
                                </th>
                                <th className="p-4 font-semibold text-gray-600">
                                    <button onClick={() => requestSort('userName')} className="flex items-center gap-1 hover:text-red-600 transition-colors">
                                        Nama Mitra {getSortIcon('userName')}
                                    </button>
                                </th>
                                <th className="p-4 font-semibold text-gray-600">
                                     <button onClick={() => requestSort('produk')} className="flex items-center gap-1 hover:text-red-600 transition-colors">
                                        Produk {getSortIcon('produk')}
                                    </button>
                                </th>
                                <th className="p-4 font-semibold text-gray-600 text-right whitespace-nowrap">
                                    <button onClick={() => requestSort('harga')} className="w-full flex justify-end items-center gap-1 hover:text-red-600 transition-colors">
                                        Harga Satuan {getSortIcon('harga')}
                                    </button>
                                </th>
                                <th className="p-4 font-semibold text-gray-600 text-right whitespace-nowrap">
                                     <button onClick={() => requestSort('kuantiti')} className="w-full flex justify-end items-center gap-1 hover:text-red-600 transition-colors">
                                        Kuantiti {getSortIcon('kuantiti')}
                                    </button>
                                </th>
                                <th className="p-4 font-semibold text-gray-600 text-right whitespace-nowrap">
                                    <button onClick={() => requestSort('totalPembelian')} className="w-full flex justify-end items-center gap-1 hover:text-red-600 transition-colors">
                                        Total {getSortIcon('totalPembelian')}
                                    </button>
                                </th>
                                <th className="p-4 font-semibold text-gray-600 text-right whitespace-nowrap">
                                    <button onClick={() => requestSort('pointsEarned')} className="w-full flex justify-end items-center gap-1 hover:text-red-600 transition-colors">
                                        Poin {getSortIcon('pointsEarned')}
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.length > 0 ? currentItems.map((item) => (
                                <tr key={item.id} className="border-t border-slate-200/80">
                                    <td className="p-4 whitespace-nowrap">{new Date(item.date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                    <td className="p-4">
                                        <p className="font-semibold text-gray-800">{item.userName}</p>
                                        <p className="text-xs text-gray-500 font-mono">{item.userId}</p>
                                    </td>
                                    <td className="p-4 font-semibold">{item.produk}</td>
                                    <td className="p-4 text-right whitespace-nowrap">Rp {(item.harga || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}</td>
                                    <td className="p-4 text-right whitespace-nowrap">{(item.kuantiti || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}</td>
                                    <td className="p-4 text-right whitespace-nowrap">Rp {(item.totalPembelian || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}</td>
                                    <td className="p-4 font-bold text-right text-green-600 whitespace-nowrap">+{(item.pointsEarned || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}</td>
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
            
            {/* Pagination Component */}
            <Pagination 
                itemsPerPage={itemsPerPage} 
                totalItems={filteredTransactions.length} 
                paginate={paginate} 
                currentPage={currentPage} 
            />
        </div>
    );
};

export default ManajemenTransaksi;
