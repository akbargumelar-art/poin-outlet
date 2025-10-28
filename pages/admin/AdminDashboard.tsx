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
    
    const allTaps = useMemo(() => [...new Set(users.filter(u => u.role === 'pelanggan' && u.profile.tap).map(u => u.profile.tap!))].sort(), [users]);

    const filteredUsers = useMemo(() => {
        const pelanggan = users.filter(u => u.role === 'pelanggan');
        if (!tapFilter) return pelanggan;
        return pelanggan.filter(u => u.profile.tap === tapFilter);
    }, [users, tapFilter]);

    const filteredTransactions = useMemo(() => {
        if (!tapFilter) return transactions;
        const filteredUserIds = new Set(filteredUsers.map(u => u.id));
        return transactions.filter(t => filteredUserIds.has(t.userId));
    }, [transactions, filteredUsers, tapFilter]);

    const totalPelanggan = filteredUsers.length;
    const totalPenjualan = filteredTransactions.reduce((sum, t) => sum + Number(t.totalPembelian), 0);
    const totalPoin = filteredUsers.reduce((sum, u) => sum + Number(u.points || 0), 0);
    
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
                <h1 className="text-2xl md:text-3xl font-bold text-gray-700">Admin Dashboard</h1>
                <div className="w-full md:w-auto md:min-w-[200px]">
                    <select value={tapFilter} onChange={e => setTapFilter(e.target.value)} className="input-field">
                        <option value="">Semua TAP</option>
                        {allTaps.map(tap => <option key={tap} value={tap}>{tap}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="neu-card p-6 flex items-center gap-4">
                    <div className="p-3 neu-card rounded-full"><Icon path={ICONS.users} className="w-8 h-8 text-red-600"/></div>
                    <div>
                        <p className="text-gray-500">Total Mitra Outlet</p>
                        <p className="text-2xl font-bold text-gray-800">{totalPelanggan}</p>
                    </div>
                </div>
                 <div className="neu-card p-6 flex items-center gap-4">
                    <div className="p-3 neu-card rounded-full"><Icon path={ICONS.history} className="w-8 h-8 text-green-600"/></div>
                    <div>
                        <p className="text-gray-500">Total Penjualan</p>
                        <p className="text-2xl font-bold text-gray-800">Rp {totalPenjualan.toLocaleString('id-ID', { maximumFractionDigits: 2 })}</p>
                    </div>
                </div>
                 <div className="neu-card p-6 flex items-center gap-4">
                    <div className="p-3 neu-card rounded-full"><Icon path={ICONS.gift} className="w-8 h-8 text-yellow-600"/></div>
                    <div>
                        <p className="text-gray-500">Total Poin Beredar</p>
                        <p className="text-2xl font-bold text-gray-800">{totalPoin.toLocaleString('id-ID', { maximumFractionDigits: 2 })}</p>
                    </div>
                </div>
            </div>
            
            <div className="mt-10">
                <SimulasiPoin loyaltyPrograms={loyaltyPrograms} />
            </div>

            <div className="mt-10">
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
        </div>
    );
};

export default AdminDashboard;