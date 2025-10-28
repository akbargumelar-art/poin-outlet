import React, { useState, useMemo } from 'react';
import { User, Page, Transaction, LoyaltyProgram, UserRole } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import Modal from '../../components/common/Modal';

interface ManajemenPelangganProps {
    users: User[];
    transactions: Transaction[];
    setCurrentPage: (page: Page) => void;
    isReadOnly?: boolean;
    loyaltyPrograms: LoyaltyProgram[];
    adminUpdateUserLevel: (userId: string, level: string) => void;
    adminResetPassword: (userId: string) => void;
}

type SortableKeys = 'nama' | 'id' | 'tap' | 'salesforce' | 'totalPembelian' | 'points' | 'level' | 'role';


const ManajemenPelanggan: React.FC<ManajemenPelangganProps> = ({ users, transactions, setCurrentPage, isReadOnly, loyaltyPrograms, adminUpdateUserLevel, adminResetPassword }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [tapFilter, setTapFilter] = useState('');
    const [salesforceFilter, setSalesforceFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [resettingUser, setResettingUser] = useState<User | null>(null);
    const [selectedLevel, setSelectedLevel] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' } | null>({ key: 'nama', direction: 'asc' });

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
        let result = [...users];

        if (roleFilter) {
            result = result.filter(u => u.role === roleFilter);
        }
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

        if (sortConfig !== null) {
            result.sort((a, b) => {
                let aValue: string | number | undefined;
                let bValue: string | number | undefined;
                
                switch (sortConfig.key) {
                    case 'totalPembelian':
                        aValue = userTotals.get(a.id)?.totalPembelian || 0;
                        bValue = userTotals.get(b.id)?.totalPembelian || 0;
                        break;
                    case 'points':
                        aValue = a.points || 0;
                        bValue = b.points || 0;
                        break;
                    case 'nama':
                        aValue = a.profile.nama || '';
                        bValue = b.profile.nama || '';
                        break;
                    case 'tap':
                        aValue = a.profile.tap || '';
                        bValue = b.profile.tap || '';
                        break;
                    case 'salesforce':
                        aValue = a.profile.salesforce || '';
                        bValue = b.profile.salesforce || '';
                        break;
                    case 'level':
                         aValue = a.level || '';
                         bValue = b.level || '';
                         break;
                    case 'role':
                        aValue = a.role;
                        bValue = b.role;
                        break;
                    case 'id':
                        aValue = a.id;
                        bValue = a.id;
                        break;
                }
        
                if (aValue === undefined || bValue === undefined) return 0;
        
                let comparison = 0;
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    comparison = aValue.localeCompare(bValue);
                } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                    comparison = aValue - bValue;
                }
                
                return sortConfig.direction === 'asc' ? comparison : -comparison;
            });
        }
        
        return result;
    }, [searchTerm, users, tapFilter, salesforceFilter, roleFilter, sortConfig, userTotals]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortableKeys) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <Icon path={ICONS.sortNeutral} className="w-4 h-4 text-gray-400" />;
        }
        if (sortConfig.direction === 'asc') {
            return <Icon path={ICONS.sortUp} className="w-4 h-4 text-gray-800" />;
        }
        return <Icon path={ICONS.sortDown} className="w-4 h-4 text-gray-800" />;
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setTapFilter('');
        setSalesforceFilter('');
        setRoleFilter('');
    };

    const handleEditUser = (user: User) => {
        if (user.role !== 'pelanggan') return;
        setEditingUser(user);
        setSelectedLevel(user.level || '');
    };

    const handleCloseModal = () => {
        setEditingUser(null);
        setSelectedLevel('');
    };
    
    const handleLevelUpdate = () => {
        if (editingUser && selectedLevel) {
            adminUpdateUserLevel(editingUser.id, selectedLevel);
            handleCloseModal();
        }
    };

    const handleConfirmResetPassword = () => {
        if (resettingUser) {
            adminResetPassword(resettingUser.id);
            setResettingUser(null);
        }
    };
    
    const handleExport = () => {
        if (filteredUsers.length === 0) {
            alert("Tidak ada data untuk diekspor dengan filter yang dipilih.");
            return;
        }
    
        const csvHeader = ['ID', 'Nama', 'Role', 'Owner', 'No. WhatsApp', 'TAP', 'Salesforce', 'Level', 'Poin', 'Kupon Undian', 'Total Pembelian'].join(',');
        
        const csvRows = filteredUsers.map(u => {
            const totalPembelian = userTotals.get(u.id)?.totalPembelian || 0;
            const owner = u.profile.owner || '';
            const cleanName = `"${u.profile.nama.replace(/"/g, '""')}"`;
            const cleanOwner = `"${owner.replace(/"/g, '""')}"`;
    
            return [
                u.id,
                cleanName,
                u.role,
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
            link.setAttribute('download', 'user_export.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const tapChartData = useMemo(() => {
        const pelangganOnly = filteredUsers.filter(u => u.role === 'pelanggan');
        const taps = [...new Set(pelangganOnly.filter(u => u.profile.tap).map(u => u.profile.tap!))];

        const data = taps.map(tap => {
            const usersInTap = pelangganOnly.filter(u => u.profile.tap === tap);
            const totalPoin = usersInTap.reduce((sum, user) => sum + (user.points || 0), 0);

            return {
                tap,
                mitraCount: usersInTap.length,
                totalPoin: totalPoin,
            };
        });

        const maxCount = Math.max(...data.map(d => d.mitraCount), 0);

        return {
            stats: data.sort((a,b) => b.mitraCount - a.mitraCount),
            maxCount: maxCount === 0 ? 1 : maxCount
        };

    }, [filteredUsers]);

    const levelPerformanceChartData = useMemo(() => {
        const levels = [
            { name: 'Bronze', color: 'from-amber-600 to-amber-500' },
            { name: 'Silver', color: 'from-slate-500 to-slate-400' },
            { name: 'Gold', color: 'from-yellow-500 to-yellow-400' },
            { name: 'Platinum', color: 'from-cyan-500 to-cyan-400' }
        ];
        const data = levels.map(level => {
            const usersInLevel = filteredUsers.filter(u => u.level === level.name && u.role === 'pelanggan');
            const totalPoints = usersInLevel.reduce((sum, user) => sum + (user.points || 0), 0);
            const totalPembelian = usersInLevel.reduce((sum, user) => sum + (userTotals.get(user.id)?.totalPembelian || 0), 0);
            
            return {
                level: level.name,
                color: level.color,
                count: usersInLevel.length,
                totalPoints: totalPoints,
                totalPembelian: totalPembelian,
            };
        });
        const maxPoints = Math.max(...data.map(d => d.totalPoints), 0);
        return {
            stats: data,
            maxPoints: maxPoints === 0 ? 1 : maxPoints // Avoid division by zero
        };
    }, [filteredUsers, userTotals]);
    
    const pointDistributionChartData = useMemo(() => {
        const levels = ['Bronze', 'Silver', 'Gold', 'Platinum'];
        const levelColors = {
            Bronze: { light: 'from-amber-500 to-amber-400', dark: 'from-amber-700 to-amber-600' },
            Silver: { light: 'from-slate-400 to-slate-300', dark: 'from-slate-600 to-slate-500' },
            Gold: { light: 'from-yellow-400 to-yellow-300', dark: 'from-yellow-600 to-yellow-500' },
            Platinum: { light: 'from-cyan-400 to-cyan-300', dark: 'from-cyan-600 to-cyan-500' }
        };

        const data = levels.map(level => {
            const usersInLevel = filteredUsers.filter(u => u.level === level && u.role === 'pelanggan');
            const withPoints = usersInLevel.filter(u => u.points && u.points > 0).length;
            const zeroPoints = usersInLevel.length - withPoints;
            return {
                level,
                withPoints,
                zeroPoints,
                colors: levelColors[level as keyof typeof levelColors]
            };
        });
        const maxCount = Math.max(...data.flatMap(d => [d.withPoints, d.zeroPoints]), 0);
        return {
            stats: data,
            maxCount: maxCount === 0 ? 1 : maxCount
        };
    }, [filteredUsers]);

    return (
        <div>
            {editingUser && (
                <Modal show={true} onClose={handleCloseModal} title={`Ubah Level: ${editingUser.profile.nama}`}>
                    <div className="space-y-4">
                        <p>Pilih level baru untuk mitra ini. Perubahan ini tidak dipengaruhi oleh jumlah poin saat ini.</p>
                        <div>
                            <label className="block text-gray-600 text-sm font-semibold mb-2">Level Loyalitas</label>
                            <select 
                                value={selectedLevel} 
                                onChange={(e) => setSelectedLevel(e.target.value)} 
                                className="input-field"
                            >
                                {loyaltyPrograms.map(p => (
                                    <option key={p.level} value={p.level}>{p.level}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end gap-4 pt-4">
                            <button onClick={handleCloseModal} className="neu-button">Batal</button>
                            <button onClick={handleLevelUpdate} className="neu-button text-red-600">Simpan Perubahan</button>
                        </div>
                    </div>
                </Modal>
            )}

            {resettingUser && (
                 <Modal show={true} onClose={() => setResettingUser(null)} title="Konfirmasi Reset Password">
                    <div className="text-center">
                        <p className="mb-6">Anda yakin ingin mereset password untuk <b>{resettingUser.profile.nama}</b>? Password baru akan dikirimkan ke nomor WhatsApp terdaftar.</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setResettingUser(null)} className="neu-button">Batal</button>
                            <button onClick={handleConfirmResetPassword} className="neu-button text-red-600">Ya, Reset Password</button>
                        </div>
                    </div>
                </Modal>
            )}

            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-700">Manajemen Pengguna</h1>
                <div className="flex gap-2">
                    {!isReadOnly && <button onClick={() => setCurrentPage('tambahUser')} className="neu-button !w-auto px-4 flex items-center gap-2"><Icon path={ICONS.plus} className="w-5 h-5"/>Tambah Pengguna</button>}
                    <button onClick={handleExport} className="neu-button !w-auto px-4 flex items-center gap-2"><Icon path={ICONS.download} className="w-5 h-5"/>Ekspor Excel</button>
                </div>
            </div>

             <div className="mb-6 neu-card-flat p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-center">
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
                    <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as UserRole | '')} className="input-field">
                        <option value="">Semua Role</option>
                        <option value="pelanggan">Mitra Outlet</option>
                        <option value="admin">Admin</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="operator">Operator</option>
                    </select>
                     <button onClick={handleResetFilters} className="neu-button">
                        Clear Filter
                    </button>
                </div>
            </div>

            <div className="mb-8 neu-card p-6">
                <h2 className="text-xl font-bold text-gray-700 mb-4">Grafik Kinerja per TAP</h2>
                 {filteredUsers.filter(u => u.role === 'pelanggan').length > 0 && tapChartData.stats.length > 0 ? (
                    <div className="overflow-x-auto">
                        <div className="flex justify-around items-end h-80 pt-8 space-x-2 border-b border-gray-200 min-w-[600px]">
                           {tapChartData.stats.map(({ tap, mitraCount, totalPoin }) => (
                               <div key={tap} className="flex flex-col items-center justify-end flex-1 h-full">
                                   <div className="text-sm font-bold text-gray-800 -mb-5 z-10">{mitraCount}</div>
                                   <div
                                       className="w-full bg-gradient-to-t from-red-600 to-red-500 rounded-t-lg transition-all duration-500 ease-out flex items-end justify-center"
                                       style={{ height: `${(mitraCount / tapChartData.maxCount) * 100}%` }}
                                       title={`${mitraCount} Mitra | ${totalPoin.toLocaleString('id-ID', { maximumFractionDigits: 2 })} Poin`}
                                   >
                                   </div>
                                   <div className="text-center mt-2 w-full">
                                       <p className="text-xs font-semibold text-gray-500 truncate">{totalPoin.toLocaleString('id-ID', { maximumFractionDigits: 2 })} Poin</p>
                                       <p className="font-bold text-gray-600 text-sm truncate">{tap}</p>
                                   </div>
                               </div>
                           ))}
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-gray-500 py-16">Tidak ada data TAP untuk ditampilkan pada grafik.</p>
                )}
            </div>

            <div className="mb-8 neu-card p-6">
                <h2 className="text-xl font-bold text-gray-700 mb-4">Grafik Kinerja per Level</h2>
                {filteredUsers.filter(u => u.role === 'pelanggan').length > 0 ? (
                    <div className="flex justify-around items-end h-80 pt-8 space-x-2 md:space-x-4 border-b border-gray-200">
                        {levelPerformanceChartData.stats.map(({ level, count, totalPoints, totalPembelian, color }) => (
                            <div key={level} className="flex flex-col items-center justify-end flex-1 h-full">
                                <div className="text-xs font-bold text-gray-800 -mb-4 z-10">{totalPoints.toLocaleString('id-ID', { maximumFractionDigits: 2 })}</div>
                                <div 
                                    className={`w-full bg-gradient-to-t ${color} rounded-t-lg transition-all duration-500 ease-out flex items-end justify-center`}
                                    style={{ height: `${(totalPoints / levelPerformanceChartData.maxPoints) * 100}%` }}
                                    title={`${count.toLocaleString('id-ID', { maximumFractionDigits: 2 })} Mitra\n${totalPoints.toLocaleString('id-ID', { maximumFractionDigits: 2 })} Poin\nRp ${totalPembelian.toLocaleString('id-ID', { maximumFractionDigits: 2 })}`}
                                >
                                </div>
                                <div className="text-center mt-2 w-full">
                                    <p className="text-xs font-semibold text-gray-500 truncate">{count.toLocaleString('id-ID', { maximumFractionDigits: 2 })} Mitra</p>
                                    <p className="font-bold text-gray-600 text-sm">{level}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 py-16">Tidak ada data untuk ditampilkan pada grafik.</p>
                )}
            </div>
            
            <div className="mb-8 neu-card p-6">
                <h2 className="text-xl font-bold text-gray-700 mb-4">Distribusi Poin per Level</h2>
                {filteredUsers.filter(u => u.role === 'pelanggan').length > 0 ? (
                    <>
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 mb-4 text-sm">
                             <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-gradient-to-br from-slate-400 to-slate-300"></div><span>Punya Poin (Warna Terang)</span></div>
                             <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-gradient-to-br from-slate-600 to-slate-500"></div><span>0 Poin (Warna Gelap)</span></div>
                        </div>
                        <div className="flex justify-around items-end h-80 pt-8 space-x-2 md:space-x-4 border-b border-gray-200">
                            {pointDistributionChartData.stats.map(({ level, withPoints, zeroPoints, colors }) => (
                                <div key={level} className="flex flex-col items-center justify-end flex-1 h-full">
                                    <div className="flex items-end justify-center w-full h-full gap-1">
                                         <div className="flex flex-col items-center justify-end w-1/2 h-full" title={`Punya Poin: ${withPoints}`}>
                                            <div className="text-xs font-bold text-gray-800 -mb-4 z-10">{withPoints}</div>
                                             <div 
                                                className={`w-full bg-gradient-to-t ${colors.light} rounded-t-md transition-all duration-500 ease-out`}
                                                style={{ height: `${(withPoints / pointDistributionChartData.maxCount) * 100}%` }}
                                            ></div>
                                         </div>
                                          <div className="flex flex-col items-center justify-end w-1/2 h-full" title={`0 Poin: ${zeroPoints}`}>
                                            <div className="text-xs font-bold text-gray-800 -mb-4 z-10">{zeroPoints}</div>
                                             <div 
                                                className={`w-full bg-gradient-to-t ${colors.dark} rounded-t-md transition-all duration-500 ease-out`}
                                                style={{ height: `${(zeroPoints / pointDistributionChartData.maxCount) * 100}%` }}
                                            ></div>
                                         </div>
                                    </div>
                                    <div className="text-center mt-2 w-full">
                                        <p className="font-bold text-gray-600 text-sm">{level}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <p className="text-center text-gray-500 py-16">Tidak ada data untuk ditampilkan pada grafik.</p>
                )}
            </div>


            <div className="neu-card-flat overflow-hidden">
                <div className="overflow-auto max-h-[60vh]">
                    <table className="w-full min-w-max text-left">
                        <thead className="bg-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 font-semibold">
                                     <button onClick={() => requestSort('nama')} className="flex items-center gap-1 hover:text-red-600 transition-colors">
                                        Nama {getSortIcon('nama')}
                                    </button>
                                </th>
                                 <th className="p-4 font-semibold whitespace-nowrap">
                                    <button onClick={() => requestSort('role')} className="flex items-center gap-1 hover:text-red-600 transition-colors">
                                        Role {getSortIcon('role')}
                                    </button>
                                </th>
                                <th className="p-4 font-semibold whitespace-nowrap">
                                    <button onClick={() => requestSort('id')} className="flex items-center gap-1 hover:text-red-600 transition-colors">
                                        ID {getSortIcon('id')}
                                    </button>
                                </th>
                                <th className="p-4 font-semibold whitespace-nowrap">
                                    <button onClick={() => requestSort('tap')} className="flex items-center gap-1 hover:text-red-600 transition-colors">
                                        TAP {getSortIcon('tap')}
                                    </button>
                                </th>
                                <th className="p-4 font-semibold whitespace-nowrap">
                                    <button onClick={() => requestSort('salesforce')} className="flex items-center gap-1 hover:text-red-600 transition-colors">
                                        Salesforce {getSortIcon('salesforce')}
                                    </button>
                                </th>
                                <th className="p-4 font-semibold text-right whitespace-nowrap">
                                    <button onClick={() => requestSort('totalPembelian')} className="flex items-center gap-1 hover:text-red-600 transition-colors w-full justify-end">
                                        Total Pembelian {getSortIcon('totalPembelian')}
                                    </button>
                                </th>
                                <th className="p-4 font-semibold text-right whitespace-nowrap">
                                    <button onClick={() => requestSort('points')} className="flex items-center gap-1 hover:text-red-600 transition-colors w-full justify-end">
                                        Poin {getSortIcon('points')}
                                    </button>
                                </th>
                                <th className="p-4 font-semibold whitespace-nowrap">
                                    <button onClick={() => requestSort('level')} className="flex items-center gap-1 hover:text-red-600 transition-colors">
                                        Level {getSortIcon('level')}
                                    </button>
                                </th>
                                {!isReadOnly && <th className="p-4 font-semibold whitespace-nowrap">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="border-t border-slate-200/80">
                                    <td className="p-4 font-semibold">{user.profile.nama}</td>
                                    <td className="p-4 capitalize">{user.role}</td>
                                    <td className="p-4 font-mono text-sm whitespace-nowrap">{user.id}</td>
                                    <td className="p-4 whitespace-nowrap">{user.profile.tap || '-'}</td>
                                    <td className="p-4 whitespace-nowrap">{user.profile.salesforce || '-'}</td>
                                    <td className="p-4 text-right whitespace-nowrap">
                                        {user.role === 'pelanggan' ? `Rp ${(userTotals.get(user.id)?.totalPembelian || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}` : '-'}
                                    </td>
                                    <td className="p-4 text-right font-bold text-red-600 whitespace-nowrap">
                                        {user.role === 'pelanggan' ? (user.points || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '-'}
                                    </td>
                                    <td className="p-4 whitespace-nowrap">{user.level || '-'}</td>
                                    {!isReadOnly && (
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleEditUser(user)} 
                                                    className="neu-button-icon text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed" 
                                                    title="Ubah Level"
                                                    disabled={user.role !== 'pelanggan'}
                                                >
                                                    <Icon path={ICONS.edit} className="w-5 h-5"/>
                                                </button>
                                                <button 
                                                    onClick={() => setResettingUser(user)}
                                                    className="neu-button-icon text-yellow-600 disabled:text-gray-400 disabled:cursor-not-allowed" 
                                                    title="Reset Password"
                                                    disabled={user.role !== 'pelanggan'}
                                                >
                                                    <Icon path={ICONS.lock} className="w-5 h-5"/>
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredUsers.length === 0 && <p className="p-8 text-center text-gray-500">Tidak ada pengguna yang cocok dengan filter yang diterapkan.</p>}
                </div>
            </div>
        </div>
    );
};

export default ManajemenPelanggan;