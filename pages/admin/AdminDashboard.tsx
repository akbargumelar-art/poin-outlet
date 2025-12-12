import React, { useState, useMemo } from 'react';
import { User, Transaction, RunningProgram, LoyaltyProgram, SpecialNumber, Redemption } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import Modal from '../../components/common/Modal';
import SimulasiPoin from '../../components/SimulasiPoin';

interface AdminDashboardProps {
    users: User[];
    transactions: Transaction[];
    runningPrograms: RunningProgram[];
    loyaltyPrograms: LoyaltyProgram[];
    specialNumbers: SpecialNumber[];
    redemptions: Redemption[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ users, transactions, runningPrograms, loyaltyPrograms, specialNumbers, redemptions }) => {
    const [tapFilter, setTapFilter] = useState('');
    const [modalData, setModalData] = useState<{title: string, users: User[]} | null>(null);
    
    const allTaps = useMemo(() => [...new Set(users.filter(u => u.role === 'pelanggan' && u.profile.tap).map(u => u.profile.tap!))].sort(), [users]);

    // --- Data Filtering Logic ---
    const filteredUsers = useMemo(() => {
        const pelanggan = users.filter(u => u.role === 'pelanggan');
        if (!tapFilter) return pelanggan;
        return pelanggan.filter(u => u.profile.tap === tapFilter);
    }, [users, tapFilter]);

    const filteredUserIds = useMemo(() => new Set(filteredUsers.map(u => u.id)), [filteredUsers]);

    const filteredTransactions = useMemo(() => {
        if (!tapFilter) return transactions;
        return transactions.filter(t => filteredUserIds.has(t.userId));
    }, [transactions, filteredUserIds, tapFilter]);

    const filteredRedemptions = useMemo(() => {
        if (!tapFilter) return redemptions;
        return redemptions.filter(r => filteredUserIds.has(r.userId));
    }, [redemptions, filteredUserIds, tapFilter]);

    const filteredSpecialNumbers = useMemo(() => {
        if (!tapFilter) return specialNumbers;
        return specialNumbers.filter(sn => sn.lokasi === tapFilter); // Assuming Location corresponds to TAP
    }, [specialNumbers, tapFilter]);

    // --- Statistics Calculation ---
    const totalPelanggan = filteredUsers.length;
    const totalPenjualan = filteredTransactions.reduce((sum, t) => sum + Number(t.totalPembelian), 0);
    const totalPoin = filteredUsers.reduce((sum, u) => sum + Number(u.points || 0), 0);
    
    // Special Number Stats
    const soldSpecialNumbers = filteredSpecialNumbers.filter(sn => sn.isSold);
    const totalSoldSNRevenue = soldSpecialNumbers.reduce((sum, sn) => sum + Number(sn.price), 0);

    // Recent Activity (Top 5)
    const recentTransactions = useMemo(() => {
        return [...filteredTransactions]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5)
            .map(t => ({
                ...t,
                userName: users.find(u => u.id === t.userId)?.profile.nama || 'N/A'
            }));
    }, [filteredTransactions, users]);

    const recentRedemptions = useMemo(() => {
        return [...filteredRedemptions]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5)
            .map(r => ({
                ...r,
                userName: users.find(u => u.id === r.userId)?.profile.nama || 'N/A'
            }));
    }, [filteredRedemptions, users]);

    const handleShowList = (program: RunningProgram, type: 'participants' | 'achievers') => {
        const userList = users.filter(user => {
            if (tapFilter && user.profile.tap !== tapFilter) return false;
            const target = program.targets.find(t => t.userId === user.id);
            if (!target) return false;
            return type === 'participants' || (type === 'achievers' && target.progress >= 100);
        });
        
        const title = type === 'participants' ? `Partisipan: ${program.name}` : `Mencapai Target: ${program.name}`;
        setModalData({ title, users: userList });
    };

    const formatDateRange = (start: string, end: string) => {
        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
        const startDate = new Date(start).toLocaleDateString('id-ID', options);
        const endDate = new Date(end).toLocaleDateString('id-ID', options);
        return `${startDate} - ${endDate}`;
    };

    const statusColors: { [key: string]: string } = {
        'Diajukan': 'bg-blue-100 text-blue-800',
        'Diproses': 'bg-amber-100 text-amber-800',
        'Selesai': 'bg-green-100 text-green-800',
        'Ditolak': 'bg-red-100 text-red-800',
    };

    return (
        <div>
            {modalData && (
                <Modal show={true} onClose={() => setModalData(null)} title={modalData.title}>
                    <div className="max-h-[60vh] overflow-y-auto">
                        {modalData.users.length > 0 ? (
                            <ul className="space-y-2">
                                {modalData.users.map(u => (
                                    <li key={u.id} className="p-3 neu-inset rounded-lg flex justify-between items-center">
                                        <span>{u.profile.nama}</span>
                                        <span className="text-sm text-gray-500 font-mono">{u.id}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-gray-500">Tidak ada data untuk ditampilkan.</p>
                        )}
                    </div>
                </Modal>
            )}

            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-700">Dashboard Overview</h1>
                <div className="w-full md:w-auto md:min-w-[200px]">
                    <select value={tapFilter} onChange={e => setTapFilter(e.target.value)} className="input-field">
                        <option value="">Semua TAP</option>
                        {allTaps.map(tap => <option key={tap} value={tap}>{tap}</option>)}
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="neu-card p-6 flex items-center gap-4">
                    <div className="p-3 neu-card rounded-full"><Icon path={ICONS.users} className="w-8 h-8 text-blue-600"/></div>
                    <div>
                        <p className="text-gray-500 text-sm">Total Mitra Outlet</p>
                        <p className="text-2xl font-bold text-gray-800">{totalPelanggan}</p>
                    </div>
                </div>
                 <div className="neu-card p-6 flex items-center gap-4">
                    <div className="p-3 neu-card rounded-full"><Icon path={ICONS.history} className="w-8 h-8 text-green-600"/></div>
                    <div>
                        <p className="text-gray-500 text-sm">Total Penjualan</p>
                        <p className="text-xl font-bold text-gray-800">Rp {totalPenjualan.toLocaleString('id-ID', { compactDisplay: "short", notation: "compact" })}</p>
                    </div>
                </div>
                 <div className="neu-card p-6 flex items-center gap-4">
                    <div className="p-3 neu-card rounded-full"><Icon path={ICONS.gift} className="w-8 h-8 text-yellow-600"/></div>
                    <div>
                        <p className="text-gray-500 text-sm">Poin Beredar</p>
                        <p className="text-xl font-bold text-gray-800">{totalPoin.toLocaleString('id-ID', { compactDisplay: "short", notation: "compact" })}</p>
                    </div>
                </div>
                {/* Resume Penjualan Nomor Spesial */}
                <div className="neu-card p-6 flex items-center gap-4">
                    <div className="p-3 neu-card rounded-full"><Icon path={ICONS.simCard} className="w-8 h-8 text-purple-600"/></div>
                    <div>
                        <p className="text-gray-500 text-sm">Penjualan No. Spesial</p>
                        <p className="text-xl font-bold text-gray-800">Rp {totalSoldSNRevenue.toLocaleString('id-ID', { compactDisplay: "short", notation: "compact" })}</p>
                        <p className="text-xs text-gray-500">{soldSpecialNumbers.length} Terjual / {filteredSpecialNumbers.length} Total</p>
                    </div>
                </div>
            </div>
            
            {/* Recent Activity Section */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-10">
                {/* Recent Transactions */}
                <div className="neu-card p-6">
                    <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <Icon path={ICONS.history} className="w-5 h-5 text-gray-500" />
                        Transaksi Terakhir
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-200 text-gray-500">
                                <tr>
                                    <th className="pb-2 font-semibold">Tanggal</th>
                                    <th className="pb-2 font-semibold">Mitra</th>
                                    <th className="pb-2 font-semibold">Produk</th>
                                    <th className="pb-2 font-semibold text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTransactions.length > 0 ? recentTransactions.map((t, idx) => (
                                    <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                        <td className="py-3 whitespace-nowrap text-gray-500">{new Date(t.date).toLocaleDateString('id-ID', {day: '2-digit', month: 'short'})}</td>
                                        <td className="py-3 font-medium text-gray-800 truncate max-w-[120px]">{t.userName}</td>
                                        <td className="py-3 text-gray-600 truncate max-w-[100px]">{t.produk}</td>
                                        <td className="py-3 text-right font-semibold">Rp {t.totalPembelian.toLocaleString('id-ID', { compactDisplay: "short", notation: "compact" })}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={4} className="py-4 text-center text-gray-500">Belum ada transaksi</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Redemptions */}
                <div className="neu-card p-6">
                    <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <Icon path={ICONS.gift} className="w-5 h-5 text-red-500" />
                        Penukaran Poin Terakhir
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-200 text-gray-500">
                                <tr>
                                    <th className="pb-2 font-semibold">Tanggal</th>
                                    <th className="pb-2 font-semibold">Mitra</th>
                                    <th className="pb-2 font-semibold">Hadiah</th>
                                    <th className="pb-2 font-semibold text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentRedemptions.length > 0 ? recentRedemptions.map((r, idx) => (
                                    <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                        <td className="py-3 whitespace-nowrap text-gray-500">{new Date(r.date).toLocaleDateString('id-ID', {day: '2-digit', month: 'short'})}</td>
                                        <td className="py-3 font-medium text-gray-800 truncate max-w-[120px]">{r.userName}</td>
                                        <td className="py-3 text-gray-600 truncate max-w-[120px]">{r.rewardName}</td>
                                        <td className="py-3 text-right">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${statusColors[r.status || 'Diajukan']}`}>
                                                {r.status || 'Diajukan'}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={4} className="py-4 text-center text-gray-500">Belum ada penukaran</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-bold text-gray-700 mb-4">Ringkasan Program Berjalan</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {runningPrograms.map(program => {
                         const filteredTargets = program.targets.filter(target => {
                            if (!tapFilter) return true;
                            const user = users.find(u => u.id === target.userId);
                            return user?.profile.tap === tapFilter;
                        });
                        const participants = filteredTargets.length;
                        const achieved = filteredTargets.filter(t => t.progress >= 100).length;
                        return (
                             <div key={program.id} className="neu-card p-6">
                                <h3 className="font-bold text-lg text-red-600">{program.name}</h3>
                                <p className="text-sm text-gray-500">{formatDateRange(program.startDate, program.endDate)}</p>
                                <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                                    <div>
                                        <button onClick={() => handleShowList(program, 'participants')} className="w-full h-full hover:bg-slate-100 rounded-lg p-2 transition-colors">
                                            <p className="text-2xl font-bold text-gray-800">{participants}</p>
                                            <p className="text-sm text-gray-500">Partisipan</p>
                                        </button>
                                    </div>
                                    <div>
                                        <button onClick={() => handleShowList(program, 'achievers')} className="w-full h-full hover:bg-slate-100 rounded-lg p-2 transition-colors">
                                            <p className="text-2xl font-bold text-green-600">{achieved}</p>
                                            <p className="text-sm text-gray-500">Mencapai Target</p>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
            
            <div className="mt-10">
                <SimulasiPoin loyaltyPrograms={loyaltyPrograms} />
            </div>
        </div>
    );
};

export default AdminDashboard;