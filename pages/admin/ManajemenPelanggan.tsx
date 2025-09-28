
import React, { useState } from 'react';
import { User, RunningProgram } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import Modal from '../../components/common/Modal';

interface ManajemenPelangganProps {
    users: User[];
    runningPrograms: RunningProgram[];
    adminDeleteUser: (userId: string) => void;
}

const ProgramProgressModal: React.FC<{user: User, programs: RunningProgram[], onClose: () => void}> = ({ user, programs, onClose}) => {
    return (
        <Modal show={true} onClose={onClose} title={`Progress Program: ${user.profile.nama}`}>
            <div className="space-y-4">
                {programs.map(p => {
                    const userProgress = p.targets.find(t => t.userId === user.id)?.progress || 0;
                    return (
                        <div key={p.id}>
                            <h4 className="font-semibold text-gray-700">{p.name}</h4>
                             <div className="w-full rounded-full h-5 mt-1 neu-inset p-1">
                                <div 
                                    className="bg-gradient-to-r from-yellow-400 to-red-500 h-full rounded-full text-center text-white text-xs font-bold flex items-center justify-center" 
                                    style={{width: `${userProgress}%`}}
                                >
                                    {userProgress}%
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Modal>
    );
};


const ManajemenPelanggan: React.FC<ManajemenPelangganProps> = ({ users, runningPrograms, adminDeleteUser }) => {
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const pelanggan = users.filter(u => u.role === 'pelanggan');

    return (
        <div>
             {selectedUser && <ProgramProgressModal user={selectedUser} programs={runningPrograms} onClose={() => setSelectedUser(null)}/>}
             <h1 className="text-3xl font-bold text-gray-700 mb-6">Manajemen Mitra Outlet</h1>
             <div className="neu-card-flat overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-slate-200/50">
                        <tr>
                            <th className="p-4 font-semibold">ID Digipos</th>
                            <th className="p-4 font-semibold">Nama Outlet</th>
                            <th className="p-4 font-semibold">Owner</th>
                            <th className="p-4 font-semibold">Poin</th>
                            <th className="p-4 font-semibold">Level</th>
                            <th className="p-4 font-semibold">Progress Program</th>
                            <th className="p-4 font-semibold">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pelanggan.map((u) => (
                            <tr key={u.id} className="border-t border-slate-200/80">
                                <td className="p-4 font-mono">{u.id}</td>
                                <td className="p-4 font-semibold">{u.profile.nama}</td>
                                <td className="p-4">{u.profile.owner}</td>
                                <td className="p-4 font-bold">{(u.points || 0).toLocaleString('id-ID')}</td>
                                <td className="p-4"><span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{u.level}</span></td>
                                <td className="p-4">
                                    <button onClick={() => setSelectedUser(u)} className="text-sm text-blue-600 font-semibold hover:underline">Lihat Detail</button>
                                </td>
                                <td className="p-4">
                                    <div className="flex gap-2">
                                        <button className="neu-button-icon text-blue-600"><Icon path={ICONS.edit} className="w-5 h-5"/></button>
                                        <button onClick={() => adminDeleteUser(u.id)} className="neu-button-icon text-red-600"><Icon path={ICONS.trash} className="w-5 h-5"/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ManajemenPelanggan;