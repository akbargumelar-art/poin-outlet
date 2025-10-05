import React, { useState, useMemo } from 'react';
import { User, Page, Transaction } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import Modal from '../../components/common/Modal';

interface ManajemenPelangganProps {
    users: User[];
    transactions: Transaction[];
    setCurrentPage: (page: Page) => void;
    isReadOnly?: boolean;
}

const ManajemenPelanggan: React.FC<ManajemenPelangganProps> = ({ users, transactions, setCurrentPage, isReadOnly }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [tapFilter, setTapFilter] = useState('');
    const [salesforceFilter, setSalesforceFilter] = useState('');

    const pelangganUsers = useMemo(() => users.filter(u => u.role === 'pelanggan'), [users]);
    const allTaps = useMemo(() => [...new Set(pelangganUsers.map(u => u.profile.tap).filter((tap): tap is string => !!tap))].sort(), [pelangganUsers]);
    const allSalesforce = useMemo(() => [...new Set(pelangganUsers.map(u => u.profile.salesforce).filter((sf): sf is string => !!sf))].sort(), [pelangganUsers]);
    
    const userTotals = useMemo(() => {
        const totals = new Map<string, { totalPembelian: number }>();
        transactions.forEach(t => {
            const current = totals.get(t.userId) || { totalPembelian: 0 };
            totals.set(t.userId, { totalPembelian: current.totalPembelian + Number(t.totalPembelian) });
        });
        return totals;
    }, [transactions]);

    const filteredUsers = useMemo(() => {
        let result = pelangganUsers;

        if (tapFilter) {
            result = result.filter(u => u.profile.tap === tapFilter);
        }
        if (salesforceFilter) {
            result = result.filter(u => u.profile.salesforce === salesforceFilter);
        }
        if (searchTerm.trim()) {
            const lowercasedSearchTerm = searchTerm.toLowerCase();
            result = result.filter(u =>
                u.profile.nama.toLowerCase().includes(lowercasedSearchTerm) ||
                u.id.toLowerCase().includes(lowercasedSearchTerm)
            );
        }
        
        return result;
    }, [searchTerm, pelangganUsers, tapFilter, salesforceFilter]);

    const handleResetFilters = () => {
        setSearchTerm('');
        setTapFilter('');
        setSalesforceFilter('');
    };
    
    const handleExport = () => {
        if (filteredUsers.length === 0) {
            alert("Tidak ada data untuk diekspor dengan filter yang dipilih.");
            return;
        }
    
        const csvHeader = ['ID Digipos', 'Nama Outlet', 'Nama Owner', 'No. WhatsApp', 'TAP', 'Salesforce', 'Level', 'Poin', 'Kupon Undian', 'Total Pembelian'].join(',');
        
        const csvRows = filteredUsers.map(u => {
            const totalPembelian = userTotals.get(u.id)?.totalPembelian || 0;
            const owner = u.profile.owner || '';
            const cleanName = `"${u.profile.nama.replace(/"/g, '""')}"`;
            const cleanOwner = `"${owner.replace(/"/g, '""')}"`;
    
            return [
                u.id,
                cleanName,
                cleanOwner,
                u.profile.phone,
                u.profile.tap,
                u.profile.salesforce,
                u.level,
                u.points || 0,
                u.kuponUndian || 0,
                totalPembelian
            ].join(',');
        });
    
        const csv = [csvHeader, ...csvRows].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'mitra_export.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const chartData = useMemo(() => {
        const levels = [
            { name: 'Bronze', color: 'from-amber-600 to-amber-500' },
            { name: 'Silver', color: 'from-slate-500 to-slate-400' },
            { name: 'Gold', color: 'from-yellow-500 to-yellow-400' },
            { name: 'Platinum', color: 'from-cyan-500 to-cyan-400' }
        ];
        const data = levels.map(level => {
            const usersInLevel = filteredUsers.filter(u => u.level === level.name);
            return {
                level: level.name,
                color: level.color,
                count: usersInLevel.length,
                totalPoints: usersInLevel.reduce((sum, user) => sum + (user.points || 0), 0)
            };
        });
        const maxCount = Math.max(...data.map(d => d.count), 0);
        return {
            stats: data,
            maxCount: maxCount === 0 ? 1 : maxCount // Avoid division by zero
        };
    }, [filteredUsers]);

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-700">Manajemen Mitra Outlet</h1>
                <div className="flex gap-2">
                    {!isReadOnly && <button onClick={() => setCurrentPage('tambahUser')} className="neu-button !w-auto px-4 flex items-center gap-2"><Icon path={ICONS.plus} className="w-5 h-5"/>Tambah Mitra</button>}
                    <button onClick={handleExport} className="neu-button !w-auto px-4 flex items-center gap-2"><Icon path={ICONS.download} className="w-5 h-5"/>Ekspor Excel</button>
                </div>
            </div>

             <div className="mb-6 neu-card-flat p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                    <input
                        type="text"
                        placeholder="Cari nama atau ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field lg:col-span-2"
                    />
                    <select value={tapFilter} onChange={e => setTapFilter(e.target.value)} className="input-field">
                        <option value="">Semua TAP</option>
                        {allTaps.map(tap => <option key={tap} value={tap}>{tap}</option>)}
                    </select>
                    <select value={salesforceFilter} onChange={e => setSalesforceFilter(e.target.value)} className="input-field">
                        <option value="">Semua Salesforce</option>
                        {allSalesforce.map(sf => <option key={sf} value={sf}>{sf}</option>)}
                    </select>
                     <button onClick={handleResetFilters} className="neu-button lg:col-start-4">
                        Clear Filter
                    </button>
                </div>
            </div>

            <div className="mb-8 neu-card p-6">
                <h2 className="text-xl font-bold text-gray-700 mb-4">Grafik Level Mitra</h2>
                {filteredUsers.length > 0 ? (
                    <div className="flex justify-around items-end h-64 pt-8 space-x-2 md:space-x-4 border-b border-gray-200">
                        {chartData.stats.map(({ level, count, totalPoints, color }) => (
                            <div key={level} className="flex flex-col items-center justify-end flex-1 h-full">
                                <div className="text-sm font-bold text-gray-800 -mb-5 z-10">{count}</div>
                                <div 
                                    className={`w-full bg-gradient-to-t ${color} rounded-t-lg transition-all duration-500 ease-out flex items-end justify-center`}
                                    style={{ height: `${(count / chartData.maxCount) * 100}%` }}
                                    title={`${count} Mitra | ${totalPoints.toLocaleString('id-ID')} Poin`}
                                >
                                </div>
                                <div className="text-center mt-2 w-full">
                                    <p className="text-xs font-semibold text-gray-500 truncate">{totalPoints.toLocaleString('id-ID')} Pts</p>
                                    <p className="font-bold text-gray-600 text-sm">{level}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 py-16">Tidak ada data untuk ditampilkan pada grafik.</p>
                )}
            </div>
            
            <div className="neu-card-flat overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-200/50">
                        <tr>
                            <th className="p-4 font-semibold w-full">Nama Outlet</th>
                            <th className="p-4 font-semibold whitespace-nowrap">ID Digipos</th>
                            <th className="p-4 font-semibold whitespace-nowrap">TAP</th>
                            <th className="p-4 font-semibold whitespace-nowrap">Salesforce</th>
                            <th className="p-4 font-semibold text-right whitespace-nowrap">Total Pembelian</th>
                            <th className="p-4 font-semibold text-right whitespace-nowrap">Poin</th>
                            <th className="p-4 font-semibold whitespace-nowrap">Level</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="border-t border-slate-200/80">
                                <td className="p-4 font-semibold">{user.profile.nama}</td>
                                <td className="p-4 font-mono text-sm whitespace-nowrap">{user.id}</td>
                                <td className="p-4 whitespace-nowrap">{user.profile.tap}</td>
                                <td className="p-4 whitespace-nowrap">{user.profile.salesforce}</td>
                                <td className="p-4 text-right whitespace-nowrap">Rp {(userTotals.get(user.id)?.totalPembelian || 0).toLocaleString('id-ID')}</td>
                                <td className="p-4 text-right font-bold text-red-600 whitespace-nowrap">{(user.points || 0).toLocaleString('id-ID')}</td>
                                <td className="p-4 whitespace-nowrap">{user.level}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredUsers.length === 0 && <p className="p-8 text-center text-gray-500">Tidak ada mitra yang cocok dengan filter yang diterapkan.</p>}
            </div>
        </div>
    );
};

export default ManajemenPelanggan;