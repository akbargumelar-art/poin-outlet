
import React, { useMemo, useState, useEffect } from 'react';
import { User, Transaction, Redemption, HistoryItem } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';

interface HistoryPembelianProps {
    currentUser: User;
    transactions: Transaction[];
    redemptionHistory: Redemption[];
}

const HistoryPembelian: React.FC<HistoryPembelianProps> = ({ currentUser, transactions, redemptionHistory }) => {
    const [filter, setFilter] = useState({ from: '', to: '' });
    const [viewingPhoto, setViewingPhoto] =useState<HistoryItem | null>(null);
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

    const statusColors: { [key: string]: string } = {
        'Diajukan': 'bg-blue-100 text-blue-800',
        'Diproses': 'bg-amber-100 text-amber-800',
        'Selesai': 'bg-green-100 text-green-800',
        'Ditolak': 'bg-red-100 text-red-800',
    };

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
                status: r.status,
                statusNote: r.statusNote,
                statusUpdatedAt: r.statusUpdatedAt,
                documentationPhotoUrl: r.documentationPhotoUrl,
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
    
    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredHistory.slice(indexOfFirstItem, indexOfLastItem);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
    
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
            {viewingPhoto && viewingPhoto.documentationPhotoUrl && (
                <Modal show={true} onClose={() => setViewingPhoto(null)} title={`Dokumentasi Penyerahan Hadiah`}>
                    <div className="text-center">
                        <img src={viewingPhoto.documentationPhotoUrl} alt={`Dokumentasi untuk ${viewingPhoto.description}`} className="w-full max-h-[70vh] object-contain rounded-lg mb-4"/>
                        <p><strong>Hadiah:</strong> {viewingPhoto.description}</p>
                        <p><strong>Tanggal:</strong> {new Date(viewingPhoto.date).toLocaleString('id-ID')}</p>
                    </div>
                </Modal>
            )}

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
                 <div className="overflow-auto min-h-[400px]">
                    <table className="w-full min-w-max text-left">
                        <thead className="bg-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600 whitespace-nowrap">Tanggal</th>
                                <th className="p-4 font-semibold text-gray-600">Tipe</th>
                                <th className="p-4 font-semibold text-gray-600">Produk / Hadiah</th>
                                <th className="p-4 font-semibold text-gray-600 text-right whitespace-nowrap">Jumlah</th>
                                <th className="p-4 font-semibold text-gray-600 text-right whitespace-nowrap">Poin</th>
                                <th className="p-4 font-semibold text-gray-600">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.length > 0 ? currentItems.map((item, index) => (
                                <tr key={index} className="border-t border-slate-200/80">
                                    <td className="p-4 whitespace-nowrap">{new Date(item.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${item.type === 'Pembelian' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                            {item.type}
                                        </span>
                                    </td>
                                    <td className="p-4 font-semibold text-gray-800">{item.description}</td>
                                    <td className="p-4 text-right whitespace-nowrap">
                                        {item.type === 'Pembelian' ? (
                                            <div>
                                                <p className="font-semibold text-gray-800">Rp {(item.amount || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}</p>
                                                {item.kuantiti && item.harga ? <p className="text-xs text-gray-500">{item.kuantiti} x Rp {(item.harga || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}</p> : null}
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className={`p-4 font-bold text-right whitespace-nowrap ${item.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {item.points > 0 ? '+' : ''}{(item.points || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-4">
                                        {item.type === 'Penukaran' ? (
                                            <div>
                                                 <span className={`px-2 py-1 text-xs font-bold rounded-full ${statusColors[item.status || 'Diajukan']}`}>
                                                    {item.status || 'Diajukan'}
                                                 </span>
                                                 {item.statusNote && <p className="text-xs text-gray-500 mt-1 italic max-w-xs">"{item.statusNote}"</p>}
                                                 {item.documentationPhotoUrl && (
                                                    <button onClick={() => setViewingPhoto(item)} className="text-xs text-blue-600 font-semibold mt-1 flex items-center gap-1 hover:underline">
                                                        <Icon path={ICONS.camera} className="w-4 h-4"/>
                                                        Lihat Foto
                                                    </button>
                                                 )}
                                                 {item.status === 'Selesai' && !item.documentationPhotoUrl && (
                                                    <div className="text-xs text-gray-400 font-semibold mt-1 flex items-center gap-1 cursor-not-allowed">
                                                        <Icon path={ICONS.camera} className="w-4 h-4"/>
                                                        <span>Foto Tdk Tersedia</span>
                                                    </div>
                                                 )}
                                            </div>
                                        ) : '-'}
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
            
            {/* Pagination Component */}
            <Pagination 
                itemsPerPage={itemsPerPage} 
                totalItems={filteredHistory.length} 
                paginate={paginate} 
                currentPage={currentPage} 
            />
        </div>
    );
};

export default HistoryPembelian;
