
import React from 'react';
import { User, Transaction, RunningProgram } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';

interface AdminDashboardProps {
    users: User[];
    transactions: Transaction[];
    runningPrograms: RunningProgram[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ users, transactions, runningPrograms }) => {
    const pelangganUsers = users.filter(u => u.role === 'pelanggan');
    const totalPelanggan = pelangganUsers.length;
    const totalPenjualan = transactions.reduce((sum, t) => sum + t.amount, 0);
    const totalPoin = users.reduce((sum, u) => sum + (u.points || 0), 0);

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-700 mb-6">Admin Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="neu-card p-6 flex items-center gap-4">
                    <div className="p-3 neu-card rounded-full"><Icon path={ICONS.users} className="w-8 h-8 text-red-600"/></div>
                    <div>
                        <p className="text-gray-500">Total Mitra Outlet</p>
                        <p className="text-3xl font-bold text-gray-800">{totalPelanggan}</p>
                    </div>
                </div>
                 <div className="neu-card p-6 flex items-center gap-4">
                    <div className="p-3 neu-card rounded-full"><Icon path={ICONS.history} className="w-8 h-8 text-green-600"/></div>
                    <div>
                        <p className="text-gray-500">Total Penjualan</p>
                        <p className="text-3xl font-bold text-gray-800">Rp {totalPenjualan.toLocaleString('id-ID')}</p>
                    </div>
                </div>
                 <div className="neu-card p-6 flex items-center gap-4">
                    <div className="p-3 neu-card rounded-full"><Icon path={ICONS.gift} className="w-8 h-8 text-yellow-600"/></div>
                    <div>
                        <p className="text-gray-500">Total Poin Beredar</p>
                        <p className="text-3xl font-bold text-gray-800">{totalPoin.toLocaleString('id-ID')}</p>
                    </div>
                </div>
            </div>

            <div className="mt-10">
                <h2 className="text-2xl font-bold text-gray-700 mb-4">Ringkasan Program Berjalan</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {runningPrograms.map(program => {
                        const participants = program.targets.length;
                        const achieved = program.targets.filter(t => t.progress >= 100).length;
                        return (
                             <div key={program.id} className="neu-card p-6">
                                <h3 className="font-bold text-lg text-red-600">{program.name}</h3>
                                <p className="text-sm text-gray-500">{program.period}</p>
                                <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                                    <div>
                                        <p className="text-2xl font-bold text-gray-800">{participants}</p>
                                        <p className="text-sm text-gray-500">Partisipan</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-green-600">{achieved}</p>
                                        <p className="text-sm text-gray-500">Mencapai Target</p>
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