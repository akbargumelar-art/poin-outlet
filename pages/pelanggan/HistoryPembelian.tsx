
import React, { useMemo, useState } from 'react';
import { User, Transaction, Redemption, HistoryItem } from '../../types';

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
                description: `Transaksi Penjualan`,
                amount: t.amount,
                points: t.points,
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

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-700">Riwayat Transaksi & Poin</h1>
                <div className="flex items-center gap-2">
                    <input type="date" name="from" value={filter.from} onChange={handleFilterChange} className="input-field !w-auto text-sm" />
                    <span className="text-gray-500">-</span>
                    <input type="date" name="to" value={filter.to} onChange={handleFilterChange} className="input-field !w-auto text-sm" />
                </div>
            </div>
            
            <div className="neu-card-flat overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-slate-200/50">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600">Tanggal</th>
                            <th className="p-4 font-semibold text-gray-600">Keterangan</th>
                            <th className="p-4 font-semibold text-gray-600 text-right">Nominal</th>
                            <th className="p-4 font-semibold text-gray-600 text-right">Poin</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredHistory.length > 0 ? filteredHistory.map((item, index) => (
                            <tr key={index} className="border-t border-slate-200/80">
                                <td className="p-4">{new Date(item.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                <td className="p-4">
                                    <p className="font-semibold text-gray-800">{item.description}</p>
                                    <p className="text-xs text-gray-500">{item.type}</p>
                                </td>
                                <td className="p-4 text-right">
                                    {item.amount > 0 ? `Rp ${item.amount.toLocaleString('id-ID')}` : '-'}
                                </td>
                                <td className={`p-4 font-bold text-right ${item.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {item.points > 0 ? '+' : ''}{item.points.toLocaleString('id-ID')}
                                </td>
                            </tr>
                        )) : (
                             <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-500">Tidak ada riwayat untuk rentang tanggal yang dipilih.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default HistoryPembelian;