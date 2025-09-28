import React, { useState } from 'react';
import { User, Transaction, RunningProgram } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import Modal from '../../components/common/Modal';

interface AdminDashboardProps {
    users: User[];
    transactions: Transaction[];
    runningPrograms: RunningProgram[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ users, transactions, runningPrograms }) => {
    const pelangganUsers = users.filter(u => u.role === 'pelanggan');
    const totalPelanggan = pelangganUsers.length;
    const totalPenjualan = transactions.reduce((sum, t) => sum + t.totalPembelian, 0);
    const totalPoin = users.reduce((sum, u) => sum + (u.points || 0), 0);

    const [modalData, setModalData] = useState<{title: string, users: User[]} | null>(null);

    const handleShowList = (program: RunningProgram, type: 'participants' | 'achievers') => {
        let targetUserIds: string[];
        let title: string;

        if(type === 'participants') {
            targetUserIds = program.targets.map(t => t.userId);
            title = `Partisipan Program: ${program.name}`;
        } else {
            targetUserIds = program.targets.filter(t => t.progress >= 100).map(t => t.userId);
            title = `Mencapai Target: ${program.name}`;
        }

        const userList = users.filter(u => targetUserIds.includes(u.id));
        setModalData({ title, users: userList });
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