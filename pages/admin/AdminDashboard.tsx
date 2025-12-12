import React, { useState, useMemo } from 'react';
import { User, Transaction, RunningProgram, LoyaltyProgram } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import Modal from '../../components/common/Modal';
import SimulasiPoin from '../../components/SimulasiPoin';

interface AdminDashboardProps {
    users: User[];
    transactions: Transaction[];
    runningPrograms: RunningProgram[];
    loyaltyPrograms: LoyaltyProgram[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ users, transactions, runningPrograms, loyaltyPrograms }) => {
    const [tapFilter, setTapFilter] = useState('');
    const [modalData, setModalData] = useState<{title: string, users: User[]} | null>(null);
    
    // Ensure users is an array to prevent crashes
    const safeUsers = Array.isArray(users) ? users : [];
    const safeTransactions = Array.isArray(transactions) ? transactions : [];
    const safeRunningPrograms = Array.isArray(runningPrograms) ? runningPrograms : [];

    const allTaps = useMemo(() => {
        return [...new Set(safeUsers.filter(u => u.role === 'pelanggan' && u.profile.tap).map(u => u.profile.tap!))].sort();
    }, [safeUsers]);

    // --- Data Filtering Logic ---
    const filteredUsers = useMemo(() => {
        const pelanggan = safeUsers.filter(u => u.role === 'pelanggan');
        if (!tapFilter) return pelanggan;
        return pelanggan.filter(u => u.profile.tap === tapFilter);
    }, [safeUsers, tapFilter]);

    const filteredUserIds = useMemo(() => new Set(filteredUsers.map(u => u.id)), [filteredUsers]);

    const filteredTransactions = useMemo(() => {
        if (!tapFilter) return safeTransactions;
        return safeTransactions.filter(t => filteredUserIds.has(t.userId));
    }, [safeTransactions, filteredUserIds, tapFilter]);

    // --- Statistics Calculation ---
    const totalPelanggan = filteredUsers.length;
    const totalPenjualan = filteredTransactions.reduce((sum, t) => sum + Number(t.totalPembelian || 0), 0);
    const totalPoin = filteredUsers.reduce((sum, u) => sum + Number(u.points || 0), 0);
    
    const handleShowList = (program: RunningProgram, type: 'participants' | 'achievers') => {
        const userList = safeUsers.filter(user => {
            if (tapFilter && user.profile.tap !== tapFilter) return false;
            const target = program.targets.find(t => t.userId === user.id);
            if (!target) return false;
            return type === 'participants' || (type === 'achievers' && target.progress >= 100);
        });
        
        const title = type === 'participants' ? `Partisipan: ${program.name}` : `Mencapai Target: ${program.name}`;
        setModalData({ title, users: userList });
    };

    const formatDateRange = (start: string, end: string) => {
        try {
            const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
            const startDate = new Date(start).toLocaleDateString('id-ID', options);
            const endDate = new Date(end).toLocaleDateString('id-ID', options);
            return `${startDate} - ${endDate}`;
        } catch (e) {
            return `${start} - ${end}`;
        }
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
                                        <div>
                                            <p className="font-semibold">{u.profile.nama}</p>
                                            <p className="text-xs text-gray-500">{u.profile.tap}</p>
                                        </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                <div className="neu-card p-6 flex items-center gap-4 border-l-4 border-blue-500">
                    <div className="p-3 bg-blue-100 rounded-full"><Icon path={ICONS.users} className="w-8 h-8 text-blue-600"/></div>
                    <div>
                        <p className="text-gray-500 text-sm font-semibold uppercase">Total Mitra Outlet</p>
                        <p className="text-2xl font-bold text-gray-800">{totalPelanggan}</p>
                    </div>
                </div>
                 <div className="neu-card p-6 flex items-center gap-4 border-l-4 border-green-500">
                    <div className="p-3 bg-green-100 rounded-full"><Icon path={ICONS.history} className="w-8 h-8 text-green-600"/></div>
                    <div>
                        <p className="text-gray-500 text-sm font-semibold uppercase">Total Penjualan</p>
                        <p className="text-xl font-bold text-gray-800">Rp {totalPenjualan.toLocaleString('id-ID', { compactDisplay: "short", notation: "compact" })}</p>
                    </div>
                </div>
                 <div className="neu-card p-6 flex items-center gap-4 border-l-4 border-yellow-500">
                    <div className="p-3 bg-yellow-100 rounded-full"><Icon path={ICONS.gift} className="w-8 h-8 text-yellow-600"/></div>
                    <div>
                        <p className="text-gray-500 text-sm font-semibold uppercase">Poin Beredar</p>
                        <p className="text-xl font-bold text-gray-800">{totalPoin.toLocaleString('id-ID', { compactDisplay: "short", notation: "compact" })}</p>
                    </div>
                </div>
            </div>
            
            {/* Ringkasan Program */}
            <div>
                <h2 className="text-2xl font-bold text-gray-700 mb-4">Ringkasan Program Berjalan</h2>
                {safeRunningPrograms.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {safeRunningPrograms.map(program => {
                             const filteredTargets = (program.targets || []).filter(target => {
                                if (!tapFilter) return true;
                                const user = safeUsers.find(u => u.id === target.userId);
                                return user?.profile.tap === tapFilter;
                            });
                            const participants = filteredTargets.length;
                            const achieved = filteredTargets.filter(t => t.progress >= 100).length;
                            
                            return (
                                 <div key={program.id} className="neu-card p-6 hover:scale-[1.02] transition-transform duration-300">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg text-red-600">{program.name}</h3>
                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{program.prizeCategory}</span>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-4">{formatDateRange(program.startDate, program.endDate)}</p>
                                    
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div onClick={() => handleShowList(program, 'participants')} className="cursor-pointer p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                                            <p className="text-3xl font-bold text-gray-800">{participants}</p>
                                            <p className="text-xs text-gray-500 font-semibold uppercase mt-1">Partisipan</p>
                                        </div>
                                        <div onClick={() => handleShowList(program, 'achievers')} className="cursor-pointer p-3 rounded-lg hover:bg-green-50 transition-colors border border-transparent hover:border-green-200">
                                            <p className="text-3xl font-bold text-green-600">{achieved}</p>
                                            <p className="text-xs text-gray-500 font-semibold uppercase mt-1">Mencapai Target</p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-8 neu-card-flat">Belum ada program berjalan.</p>
                )}
            </div>
            
            <div className="mt-10">
                <SimulasiPoin loyaltyPrograms={loyaltyPrograms} />
            </div>
        </div>
    );
};

export default AdminDashboard;