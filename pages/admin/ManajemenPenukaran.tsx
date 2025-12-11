
import React, { useState, useMemo } from 'react';
import { Redemption, User } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import Modal from '../../components/common/Modal';

// --- Status Edit Modal Component ---
const StatusEditModal: React.FC<{
    redemption: Redemption;
    onSave: (status: string, note: string, photoFile: File | null) => void;
    onClose: () => void;
}> = ({ redemption, onSave, onClose }) => {
    const [status, setStatus] = useState(redemption.status || 'Diajukan');
    const [note, setNote] = useState(redemption.statusNote || '');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(redemption.documentationPhotoUrl || null);

    const statusOptions = ['Diajukan', 'Diproses', 'Selesai', 'Ditolak'];

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = () => {
        onSave(status, note, photoFile);
    };

    return (
        <Modal show={true} onClose={onClose} title={`Update Status: ${redemption.rewardName}`}>
            <div className="space-y-4">
                <div>
                    <label className="block text-gray-600 text-sm font-semibold mb-2">Status</label>
                    <select value={status} onChange={e => setStatus(e.target.value)} className="input-field">
                        {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
                
                {status === 'Selesai' && (
                    <div className="animate-fade-in-down">
                        <label className="block text-gray-600 text-sm font-semibold mb-2">
                            Bukti Dokumentasi (Wajib untuk Status Selesai)
                        </label>
                        <div className="flex items-center gap-4 border border-dashed border-gray-300 p-4 rounded-lg bg-gray-50">
                            {photoPreview ? (
                                <img src={photoPreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg shadow-sm" />
                            ) : (
                                <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                                    <Icon path={ICONS.camera} className="w-8 h-8" />
                                </div>
                            )}
                            <div>
                                <label htmlFor="doc-upload" className="neu-button !w-auto px-4 py-2 cursor-pointer text-sm">
                                    {photoPreview ? 'Ganti Foto' : 'Pilih Foto'}
                                </label>
                                <input 
                                    id="doc-upload" 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handlePhotoChange} 
                                    className="hidden" 
                                />
                                <p className="text-xs text-gray-500 mt-2">Format: JPG, PNG (Max 5MB)</p>
                            </div>
                        </div>
                    </div>
                )}

                <div>
                     <label className="block text-gray-600 text-sm font-semibold mb-2">Catatan (Opsional)</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} className="input-field min-h-[80px]" placeholder="e.g., Hadiah sudah bisa diambil di TAP."/>
                </div>
                 <div className="flex justify-end gap-4 pt-4">
                    <button onClick={onClose} className="neu-button">Batal</button>
                    <button onClick={handleSave} className="neu-button text-red-600">Simpan</button>
                </div>
            </div>
        </Modal>
    );
};

interface ManajemenPenukaranProps {
    redemptions: Redemption[];
    users: User[];
    isReadOnly?: boolean;
    adminUpdateRedemptionStatus: (redemptionId: number, status: string, statusNote: string, photoFile?: File | null) => void;
}

const ManajemenPenukaran: React.FC<ManajemenPenukaranProps> = ({ redemptions, users, isReadOnly, adminUpdateRedemptionStatus }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState({ from: '', to: '' });
    
    // New Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [tapFilter, setTapFilter] = useState('');
    const [salesforceFilter, setSalesforceFilter] = useState('');

    const [editingRedemption, setEditingRedemption] = useState<Redemption | null>(null);
    const [viewingPhoto, setViewingPhoto] = useState<Redemption | null>(null);

    const statusColors: { [key: string]: string } = {
        'Diajukan': 'text-blue-600',
        'Diproses': 'text-amber-600',
        'Selesai': 'text-green-600',
        'Ditolak': 'text-red-600',
    };

    const redemptionsWithUserData = useMemo(() => {
        return redemptions.map(r => {
            const user = users.find(u => u.id === r.userId);
            return {
                ...r,
                userTap: user?.profile.tap || '-',
                userSalesforce: user?.profile.salesforce || '-'
            };
        });
    }, [redemptions, users]);

    // Extract unique values for dropdowns based on existing data
    const uniqueTaps = useMemo(() => [...new Set(redemptionsWithUserData.map(r => r.userTap).filter(t => t !== '-'))].sort(), [redemptionsWithUserData]);
    const uniqueSalesforces = useMemo(() => [...new Set(redemptionsWithUserData.map(r => r.userSalesforce).filter(s => s !== '-'))].sort(), [redemptionsWithUserData]);

    const filteredRedemptions = useMemo(() => {
        return redemptionsWithUserData.filter(item => {
            const itemDate = new Date(item.date);
            const fromDate = filter.from ? new Date(filter.from) : null;
            const toDate = filter.to ? new Date(filter.to) : null;
            
            if(fromDate) fromDate.setHours(0,0,0,0);
            if(toDate) toDate.setHours(23,59,59,999);

            if (fromDate && itemDate < fromDate) return false;
            if (toDate && itemDate > toDate) return false;

            if (statusFilter && (item.status || 'Diajukan') !== statusFilter) return false;
            if (tapFilter && item.userTap !== tapFilter) return false;
            if (salesforceFilter && item.userSalesforce !== salesforceFilter) return false;

            if (searchTerm.trim()) {
                const lowercasedSearchTerm = searchTerm.toLowerCase();
                return (
                    item.userName?.toLowerCase().includes(lowercasedSearchTerm) ||
                    item.userId.toLowerCase().includes(lowercasedSearchTerm) ||
                    item.rewardName.toLowerCase().includes(lowercasedSearchTerm) ||
                    item.userTap.toLowerCase().includes(lowercasedSearchTerm) ||
                    item.userSalesforce.toLowerCase().includes(lowercasedSearchTerm)
                );
            }
            
            return true;
        });
    }, [redemptionsWithUserData, filter, searchTerm, statusFilter, tapFilter, salesforceFilter]);
    
    // Calculate summary based on filtered data (Status)
    const summaryStats = useMemo(() => {
        const stats = {
            Total: 0,
            Diajukan: 0,
            Diproses: 0,
            Selesai: 0,
            Ditolak: 0
        };
        filteredRedemptions.forEach(r => {
            stats.Total++;
            const status = r.status || 'Diajukan';
            if (status in stats) {
                stats[status as keyof typeof stats]++;
            }
        });
        return stats;
    }, [filteredRedemptions]);

    // Calculate Unique Partners (Outlet) based on filtered data
    const uniquePartnersCount = useMemo(() => {
        return new Set(filteredRedemptions.map(r => r.userId)).size;
    }, [filteredRedemptions]);

    // Calculate summary based on filtered data (Rewards)
    const rewardStats = useMemo(() => {
        const stats: { [key: string]: { count: number; totalPoints: number; userIds: Set<string> } } = {};
        
        filteredRedemptions.forEach(r => {
            const name = r.rewardName || 'Unknown';
            if (!stats[name]) {
                stats[name] = { count: 0, totalPoints: 0, userIds: new Set() };
            }
            stats[name].count++;
            stats[name].totalPoints += (r.pointsSpent || 0);
            stats[name].userIds.add(r.userId);
        });

        // Convert to array and sort by count descending
        return Object.entries(stats)
            .map(([name, data]) => ({ 
                name, 
                count: data.count, 
                totalPoints: data.totalPoints,
                outletCount: data.userIds.size // Count of unique outlets per reward
            }))
            .sort((a, b) => b.count - a.count);
    }, [filteredRedemptions]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilter(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleResetFilters = () => {
        setFilter({ from: '', to: '' });
        setSearchTerm('');
        setStatusFilter('');
        setTapFilter('');
        setSalesforceFilter('');
    };

    const handleUpdateStatus = (status: string, note: string, photoFile: File | null) => {
        if (editingRedemption) {
            adminUpdateRedemptionStatus(editingRedemption.id, status, note, photoFile);
            setEditingRedemption(null);
        }
    };

    const handleExport = () => {
        if (filteredRedemptions.length === 0) {
            alert("Tidak ada data untuk diekspor dengan filter yang dipilih.");
            return;
        }
    
        const csvHeader = ['Tanggal', 'ID Mitra', 'Nama Mitra', 'TAP', 'Salesforce', 'Hadiah', 'Poin Dihabiskan', 'Status', 'Catatan Status'].join(',');
        
        const csvRows = filteredRedemptions.map(r => {
            const cleanRewardName = `"${(r.rewardName || 'N/A').replace(/"/g, '""')}"`;
            const cleanUserName = `"${(r.userName || 'N/A').replace(/"/g, '""')}"`;
            const formattedDate = new Date(r.date).toLocaleString('id-ID', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            }).replace(/\./g, ':');
            const statusText = r.status || 'Diajukan';
            const statusNote = `"${(r.statusNote || '').replace(/"/g, '""')}"`;

            return [
                formattedDate,
                r.userId,
                cleanUserName,
                r.userTap,
                r.userSalesforce,
                cleanRewardName,
                r.pointsSpent,
                statusText,
                statusNote
            ].join(',');
        });
    
        const csv = [csvHeader, ...csvRows].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'riwayat_penukaran.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const SummaryCard = ({ title, count, colorClass, icon }: { title: string, count: number, colorClass: string, icon: string }) => (
        <div className={`p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between bg-white`}>
            <div>
                <p className="text-gray-500 text-xs font-semibold uppercase">{title}</p>
                <p className={`text-2xl font-bold mt-1 ${colorClass}`}>{count}</p>
            </div>
            <div className={`p-2 rounded-full ${colorClass.replace('text-', 'bg-').replace('600', '100')}`}>
                <Icon path={icon} className={`w-6 h-6 ${colorClass}`} />
            </div>
        </div>
    );

    return (
        <div>
             {editingRedemption && !isReadOnly && (
                <StatusEditModal 
                    redemption={editingRedemption}
                    onSave={handleUpdateStatus}
                    onClose={() => setEditingRedemption(null)}
                />
            )}
             {viewingPhoto && viewingPhoto.documentationPhotoUrl && (
                <Modal show={true} onClose={() => setViewingPhoto(null)} title={`Dokumentasi: ${viewingPhoto.rewardName}`}>
                    <div className="text-center">
                        <img src={viewingPhoto.documentationPhotoUrl} alt={`Dokumentasi untuk ${viewingPhoto.rewardName}`} className="w-full max-h-[70vh] object-contain rounded-lg mb-4"/>
                        <p><strong>Mitra:</strong> {viewingPhoto.userName}</p>
                        <p><strong>Tanggal:</strong> {new Date(viewingPhoto.date).toLocaleString('id-ID')}</p>
                    </div>
                </Modal>
            )}

            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-700">Riwayat Penukaran Poin Mitra</h1>
                <button onClick={handleExport} className="neu-button !w-auto px-4 flex items-center gap-2">
                    <Icon path={ICONS.download} className="w-5 h-5"/>Ekspor Excel
                </button>
            </div>

            {/* Summary Statistics (Status) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <SummaryCard title="Total Request" count={summaryStats.Total} colorClass="text-gray-700" icon={ICONS.dashboard} />
                <SummaryCard title="Outlet" count={uniquePartnersCount} colorClass="text-purple-600" icon={ICONS.store} />
                <SummaryCard title="Diajukan" count={summaryStats.Diajukan} colorClass="text-blue-600" icon={ICONS.upload} />
                <SummaryCard title="Diproses" count={summaryStats.Diproses} colorClass="text-amber-600" icon={ICONS.history} />
                <SummaryCard title="Selesai" count={summaryStats.Selesai} colorClass="text-green-600" icon={ICONS.trophy} />
                <SummaryCard title="Ditolak" count={summaryStats.Ditolak} colorClass="text-red-600" icon={ICONS.close} />
            </div>

            {/* Summary Statistics (Rewards) */}
            <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Icon path={ICONS.gift} className="w-5 h-5 text-purple-600" />
                    Statistik Hadiah (Berdasarkan Filter)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {rewardStats.map((stat) => (
                        <div key={stat.name} className="neu-card-flat p-4 border-l-4 border-purple-500 bg-white flex flex-col justify-between h-full">
                            <div>
                                <p className="text-xs text-gray-500 font-semibold uppercase truncate mb-1" title={stat.name}>{stat.name}</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-bold text-gray-800">{stat.count}</p>
                                    <span className="text-xs text-gray-500">Unit</span>
                                </div>
                                {/* New: Outlet Count */}
                                <div className="flex items-center gap-1 mt-1 text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded w-fit">
                                    <Icon path={ICONS.store} className="w-3 h-3" />
                                    <span>{stat.outletCount} Outlet</span>
                                </div>
                            </div>
                            <div className="mt-2 text-right">
                                <p className="text-xs text-red-600 font-bold bg-red-50 px-2 py-1 rounded inline-block">
                                    -{stat.totalPoints.toLocaleString('id-ID', { compactDisplay: "short", notation: "compact" })} Poin
                                </p>
                            </div>
                        </div>
                    ))}
                    {rewardStats.length === 0 && (
                        <div className="col-span-full text-center py-4 bg-gray-50 rounded-lg text-gray-500 text-sm italic border border-dashed border-gray-300">
                            Tidak ada data penukaran hadiah yang cocok dengan filter.
                        </div>
                    )}
                </div>
            </div>
            
            {/* Advanced Filters */}
            <div className="mb-6 neu-card-flat p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <input
                        type="text"
                        placeholder="Cari nama, ID, hadiah..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field"
                    />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field">
                        <option value="">Semua Status</option>
                        <option value="Diajukan">Diajukan</option>
                        <option value="Diproses">Diproses</option>
                        <option value="Selesai">Selesai</option>
                        <option value="Ditolak">Ditolak</option>
                    </select>
                    <select value={tapFilter} onChange={e => setTapFilter(e.target.value)} className="input-field">
                        <option value="">Semua TAP</option>
                        {uniqueTaps.map(tap => <option key={tap} value={tap}>{tap}</option>)}
                    </select>
                    <select value={salesforceFilter} onChange={e => setSalesforceFilter(e.target.value)} className="input-field">
                        <option value="">Semua Salesforce</option>
                        {uniqueSalesforces.map(sf => <option key={sf} value={sf}>{sf}</option>)}
                    </select>
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-4 border-t border-gray-200/50 pt-4">
                    <span className="text-sm font-semibold text-gray-600">Filter Tanggal:</span>
                    <input type="date" name="from" value={filter.from} onChange={handleFilterChange} className="input-field !w-auto text-sm" />
                    <span className="text-gray-500">-</span>
                    <input type="date" name="to" value={filter.to} onChange={handleFilterChange} className="input-field !w-auto text-sm" />
                    <button onClick={handleResetFilters} className="neu-button !w-auto px-6 text-sm ml-auto">
                        Reset Filter
                    </button>
                </div>
            </div>

            <div className="neu-card-flat overflow-hidden">
                <div className="overflow-auto max-h-[60vh]">
                    <table className="w-full min-w-max text-left">
                        <thead className="bg-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600 whitespace-nowrap">Tanggal</th>
                                <th className="p-4 font-semibold text-gray-600">Nama Mitra</th>
                                <th className="p-4 font-semibold text-gray-600 whitespace-nowrap">TAP</th>
                                <th className="p-4 font-semibold text-gray-600 whitespace-nowrap">Salesforce</th>
                                <th className="p-4 font-semibold text-gray-600">Hadiah</th>
                                <th className="p-4 font-semibold text-gray-600">Status</th>
                                <th className="p-4 font-semibold text-gray-600 text-right whitespace-nowrap">Poin Digunakan</th>
                                <th className="p-4 font-semibold text-gray-600">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRedemptions.length > 0 ? filteredRedemptions.map((item, index) => (
                                <tr key={item.id || index} className="border-t border-slate-200/80">
                                    <td className="p-4 whitespace-nowrap">{new Date(item.date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                    <td className="p-4">
                                        <p className="font-semibold text-gray-800">{item.userName || 'Nama Tidak Ditemukan'}</p>
                                        <p className="text-xs text-gray-500 font-mono">{item.userId}</p>
                                    </td>
                                    <td className="p-4 whitespace-nowrap">{item.userTap}</td>
                                    <td className="p-4 whitespace-nowrap">{item.userSalesforce}</td>
                                    <td className="p-4 font-semibold">{item.rewardName}</td>
                                    <td className="p-4 whitespace-nowrap">
                                        <p className={`font-semibold ${statusColors[item.status || 'Diajukan'] || 'text-gray-700'}`}>
                                            {item.status || 'Diajukan'}
                                        </p>
                                        {item.status === 'Selesai' && item.statusUpdatedAt && 
                                            <p className="text-xs text-gray-500">
                                                pada {new Date(item.statusUpdatedAt).toLocaleDateString('id-ID')}
                                            </p>
                                        }
                                        {item.statusNote && <p className="text-xs text-gray-500 italic">"{item.statusNote}"</p>}
                                    </td>
                                    <td className="p-4 font-bold text-right text-red-600 whitespace-nowrap">{(item.pointsSpent || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}</td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            {item.documentationPhotoUrl && (
                                                <button onClick={() => setViewingPhoto(item)} className="neu-button-icon text-purple-600" title="Lihat Foto Dokumentasi">
                                                    <Icon path={ICONS.camera} className="w-5 h-5"/>
                                                </button>
                                            )}
                                            {item.status === 'Selesai' && !item.documentationPhotoUrl && (
                                                <div className="neu-button-icon cursor-not-allowed opacity-50" title="Dokumentasi tidak tersedia">
                                                    <Icon path={ICONS.camera} className="w-5 h-5 text-gray-400"/>
                                                </div>
                                            )}
                                            {!isReadOnly && (
                                                <button onClick={() => setEditingRedemption(item)} className="neu-button-icon text-blue-600" title="Ubah Status">
                                                    <Icon path={ICONS.edit} className="w-5 h-5"/>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                 <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-500">Tidak ada riwayat penukaran yang cocok.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManajemenPenukaran;
