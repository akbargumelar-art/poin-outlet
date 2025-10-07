import React, { useMemo, useState } from 'react';
import { User, Transaction, Redemption, HistoryItem } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';

interface HistoryPembelianProps {
    currentUser: User;
    transactions: Transaction[];
    redemptionHistory: Redemption[];
}

const HistoryPembelian: React.FC<HistoryPembelianProps> = ({ currentUser, transactions, redemptionHistory }) => {
    const [filter, setFilter] = useState({ from: '', to: '' });

    const combinedHistory = useMemo(() => {
        const transactionHistory: HistoryItem[] = transactions
            .filter(t => t.userId === currentUser.id)
            .map(t => ({
                date: t.date,
                type: 'Pembelian',
                description: t.produk,
                amount: t.totalPembelian,
                points: t.pointsEarned,
                harga: t.harga,
                kuantiti: t.kuantiti,
            }));

        const redemptionHistoryItems: HistoryItem[] = redemptionHistory
            .filter(r => r.userId === currentUser.id)
            .map(r => ({
                date: r.date,
                type: 'Penukaran',
                description: r.rewardName,
                amount: 0,
                points: -r.pointsSpent,
            }));

        return [...transactionHistory, ...redemptionHistoryItems]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [currentUser.id, transactions, redemptionHistory]);

    const filteredHistory = useMemo(() => {
        if (!filter.from && !filter.to) return combinedHistory;
        return combinedHistory.filter(item => {
            const itemDate = new Date(item.date);
            const fromDate = filter.from ? new Date(filter.from) : null;
            const toDate = filter.to ? new Date(filter.to) : null;
            
            if(fromDate) fromDate.setHours(0,0,0,0);
            if(toDate) toDate.setHours(23,59,59,999);

            if (fromDate && itemDate < fromDate) return false;
            if (toDate && itemDate > toDate) return false;
            return true;
        });
    }, [combinedHistory, filter]);
    
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilter(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleResetFilters = () => {
        setFilter({ from: '', to: '' });
    };

    const chartData = useMemo(() => {
        const historyAsc = [...filteredHistory].reverse();
        if (historyAsc.length < 2) return null;

        let runningPoints = 0;
        const dataPoints = historyAsc.map(item => {
            runningPoints += item.points;
            return {
                date: new Date(item.date),
                points: runningPoints
            };
        });

        const maxPoints = Math.max(...dataPoints.map(d => d.points));
        const minPoints = Math.min(...dataPoints.map(d => d.points));
        const pointRange = maxPoints - minPoints;

        const startDate = dataPoints[0].date.getTime();
        const endDate = dataPoints[dataPoints.length - 1].date.getTime();
        const timeRange = endDate - startDate;

        const points = dataPoints.map(dp => {
            const x = timeRange > 0 ? ((dp.date.getTime() - startDate) / timeRange) * 100 : 50;
            const y = pointRange > 0 ? 100 - ((dp.points - minPoints) / pointRange) * 90 - 5 : 50; // Use 90% of height with 5% margin
            return `${x},${y}`;
        }).join(' ');

        return { points, minPoints, maxPoints, startDate: dataPoints[0].date, endDate: dataPoints[dataPoints.length - 1].date };
    }, [filteredHistory]);


    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-700">Riwayat Transaksi & Poin</h1>
                <div className="flex items-center gap-2">
                    <input type="date" name="from" value={filter.from} onChange={handleFilterChange} className="input-field !w-auto text-sm" />
                    <span className="text-gray-500">-</span>
                    <input type="date" name="to" value={filter.to} onChange={handleFilterChange} className="input-field !w-auto text-sm" />
                    <button onClick={handleResetFilters} className="neu-button-icon !p-2" title="Clear Filter">
                        <Icon path={ICONS.close} className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {chartData && (
                 <div className="neu-card p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Tren Poin</h2>
                    <div className="h-48 w-full">
                         <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                             <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" style={{stopColor: 'rgba(239, 68, 68, 0.4)'}} />
                                <stop offset="100%" style={{stopColor: 'rgba(239, 68, 68, 0)'}} />
                                </linearGradient>
                            </defs>
                            <polyline
                                fill="url(#gradient)"
                                stroke="#ef4444"
                                strokeWidth="1"
                                points={`0,100 ${chartData.points} 100,100`}
                            />
                        </svg>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1 font-semibold">
                        <span>{chartData.startDate.toLocaleDateString('id-ID')}</span>
                        <span>{chartData.endDate.toLocaleDateString('id-ID')}</span>
                    </div>
                </div>
            )}
            
            <div className="neu-card-flat overflow-hidden">
                 <div className="overflow-auto max-h-[60vh]">
                    <table className="w-full min-w-max text-left">
                        <thead className="bg-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600 whitespace-nowrap">Tanggal</th>
                                <th className="p-4 font-semibold text-gray-600 w-full">Keterangan</th>
                                <th className="p-4 font-semibold text-gray-600 text-right whitespace-nowrap">Harga Satuan</th>
                                <th className="p-4 font-semibold text-gray-600 text-right whitespace-nowrap">Kuantiti</th>
                                <th className="p-4 font-semibold text-gray-600 text-right whitespace-nowrap">Nominal</th>
                                <th className="p-4 font-semibold text-gray-600 text-right whitespace-nowrap">Poin</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredHistory.length > 0 ? filteredHistory.map((item, index) => (
                                <tr key={index} className="border-t border-slate-200/80">
                                    <td className="p-4 whitespace-nowrap">{new Date(item.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                    <td className="p-4">
                                        <p className="font-semibold text-gray-800">{item.description}</p>
                                        <p className="text-xs text-gray-500">{item.type}</p>
                                    </td>
                                    <td className="p-4 text-right whitespace-nowrap">
                                        {item.type === 'Pembelian' && item.harga ? `Rp ${item.harga.toLocaleString('id-ID')}` : '-'}
                                    </td>
                                     <td className="p-4 text-right whitespace-nowrap">
                                        {item.type === 'Pembelian' && item.kuantiti ? item.kuantiti.toLocaleString('id-ID') : '-'}
                                    </td>
                                    <td className="p-4 text-right whitespace-nowrap">
                                        {item.amount > 0 ? `Rp ${item.amount.toLocaleString('id-ID')}` : '-'}
                                    </td>
                                    <td className={`p-4 font-bold text-right whitespace-nowrap ${item.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {item.points > 0 ? '+' : ''}{item.points.toLocaleString('id-ID')}
                                    </td>
                                </tr>
                            )) : (
                                 <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">Tidak ada riwayat untuk rentang tanggal yang dipilih.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default HistoryPembelian;