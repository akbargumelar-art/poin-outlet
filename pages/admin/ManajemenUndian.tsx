
import React, { useState, useMemo, useEffect } from 'react';
import { User, RaffleProgram, CouponRedemption } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import Modal from '../../components/common/Modal';

// --- Form Component ---
interface ProgramFormProps {
    program?: RaffleProgram;
    onSave: (program: Omit<RaffleProgram, 'id'> & { id?: number }) => void;
    onCancel: () => void;
}

const ProgramForm: React.FC<ProgramFormProps> = ({ program, onSave, onCancel }) => {
    const [formData, setFormData] = useState(program || { name: '', prize: '', period: '', isActive: false });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Nama Program Undian" className="input-field" required />
            <input name="prize" value={formData.prize} onChange={handleChange} placeholder="Hadiah Utama" className="input-field" required />
            <input name="period" value={formData.period} onChange={handleChange} placeholder="Periode (e.g., 1 Jan - 31 Mar 2025)" className="input-field" required />
            <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="h-5 w-5 rounded" />
                <span>Jadikan program aktif? (hanya boleh ada 1 yang aktif)</span>
            </label>
            <div className="flex gap-4 pt-4">
                <button type="button" onClick={onCancel} className="neu-button">Batal</button>
                <button type="submit" className="neu-button text-red-600">Simpan</button>
            </div>
        </form>
    );
};

// --- Main Component ---
interface ManajemenUndianProps {
    users: User[];
    programs: RaffleProgram[];
    setPrograms: React.Dispatch<React.SetStateAction<RaffleProgram[]>>;
    redemptions: CouponRedemption[];
    isReadOnly?: boolean;
}

const ManajemenUndian: React.FC<ManajemenUndianProps> = ({ users, programs, setPrograms, redemptions, isReadOnly }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [tapFilter, setTapFilter] = useState('');
    const [salesforceFilter, setSalesforceFilter] = useState('');
    
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingProgram, setEditingProgram] = useState<RaffleProgram | undefined>(undefined);
    const [showWinnerModal, setShowWinnerModal] = useState(false);
    const [winner, setWinner] = useState<User | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const activeProgram = programs.find(p => p.isActive);

    const allTaps = useMemo(() => [...new Set(users.map(u => u.profile.tap).filter(Boolean))].sort() as string[], [users]);
    const allSalesforce = useMemo(() => [...new Set(users.map(u => u.profile.salesforce).filter(Boolean))].sort(), [users]);

    const participantData = useMemo(() => {
        if (!activeProgram) return [];

        const couponsPerUser = redemptions
            .filter(r => r.raffleProgramId === activeProgram.id)
            .reduce((acc, r) => {
                acc[r.userId] = (acc[r.userId] || 0) + 1;
                return acc;
            }, {} as { [userId: string]: number });
        
        return Object.keys(couponsPerUser).map(userId => {
            const user = users.find(u => u.id === userId);
            return { user, couponCount: couponsPerUser[userId] };
        }).filter(item => item.user);
    }, [activeProgram, redemptions, users]);

    const filteredParticipants = useMemo(() => {
        return participantData.filter(({ user }) => {
            if (!user) return false;
            const searchTermLower = searchTerm.toLowerCase();
            return (
                (tapFilter ? user.profile.tap === tapFilter : true) &&
                (salesforceFilter ? user.profile.salesforce === salesforceFilter : true) &&
                (searchTerm ? user.profile.nama.toLowerCase().includes(searchTermLower) || user.id.toLowerCase().includes(searchTermLower) : true)
            );
        });
    }, [participantData, searchTerm, tapFilter, salesforceFilter]);
    
    const tapChartData = useMemo(() => {
        const data = allTaps.map(tap => {
            const participantsInTap = participantData.filter(p => p.user?.profile.tap === tap);
            return {
                tap,
                outletCount: new Set(participantsInTap.map(p => p.user!.id)).size,
                couponCount: participantsInTap.reduce((sum, p) => sum + p.couponCount, 0)
            };
        });
        const maxCount = Math.max(...data.map(d => d.outletCount), 0);
        return {
            stats: data.filter(d => d.outletCount > 0),
            maxCount: maxCount === 0 ? 1 : maxCount
        };
    }, [participantData, allTaps]);


    const handleSaveProgram = (program: Omit<RaffleProgram, 'id'> & { id?: number }) => {
        const newPrograms = programs.map(p => ({ ...p, isActive: program.isActive ? false : p.isActive }));
        
        if (program.id) {
            setPrograms(newPrograms.map(p => p.id === program.id ? { ...program, id: program.id } as RaffleProgram : p));
        } else {
            const newProgram = { ...program, id: Date.now() };
            setPrograms([...newPrograms, newProgram]);
        }
        setShowFormModal(false);
        setEditingProgram(undefined);
    };

    const handleDeleteProgram = (id: number) => {
        if (window.confirm('Anda yakin ingin menghapus program ini?')) {
            setPrograms(programs.filter(p => p.id !== id));
        }
    };
    
    const handleDrawWinner = () => {
        if (participantData.length === 0) return;
        setIsDrawing(true);
        setShowWinnerModal(true);

        const weightedList: string[] = [];
        participantData.forEach(({ user, couponCount }) => {
            if (user) {
                for (let i = 0; i < couponCount; i++) {
                    weightedList.push(user.id);
                }
            }
        });

        setTimeout(() => {
            const winnerId = weightedList[Math.floor(Math.random() * weightedList.length)];
            const winnerUser = users.find(u => u.id === winnerId);
            setWinner(winnerUser || null);
            setIsDrawing(false);
        }, 3000); // Simulate drawing time
    };
    
    const resetWinnerModal = () => {
        setShowWinnerModal(false);
        setWinner(null);
        setIsDrawing(false);
    }
    
    const handleExport = () => alert("Simulasi ekspor data rekap kupon ke file Excel berhasil.");

    return (
        <div>
            {showFormModal && (
                <Modal show={true} onClose={() => setShowFormModal(false)} title={editingProgram ? "Edit Program Undian" : "Tambah Program Undian"}>
                    <ProgramForm program={editingProgram} onSave={handleSaveProgram} onCancel={() => setShowFormModal(false)} />
                </Modal>
            )}
            {showWinnerModal && (
                <Modal show={true} onClose={resetWinnerModal} title="Pemenang Undian">
                    <div className="text-center p-8 min-h-[200px] flex flex-col justify-center items-center">
                        {isDrawing ? (
                            <>
                                <p className="text-xl font-bold animate-pulse">Mengundi Pemenang...</p>
                                <Icon path={ICONS.ticket} className="w-16 h-16 text-red-500 animate-spin mt-4" />
                            </>
                        ) : winner ? (
                            <>
                                <p className="text-lg">Selamat kepada</p>
                                <h3 className="text-4xl font-bold text-red-600 my-2">{winner.profile.nama}</h3>
                                <p className="text-gray-500 font-mono">{winner.id}</p>
                                <p className="mt-4">Sebagai Pemenang Undian {activeProgram?.name}!</p>
                            </>
                        ) : <p>Tidak ada pemenang yang dapat diundi.</p>}
                         <button onClick={resetWinnerModal} className="neu-button text-red-600 !w-auto px-8 mt-8">Tutup</button>
                    </div>
                </Modal>
            )}

            <h1 className="text-3xl font-bold text-gray-700 mb-6">Manajemen Undian</h1>
            
            {/* Active Program Section */}
            <div className="neu-card p-6 mb-8">
                <h2 className="text-2xl font-bold text-gray-700 mb-4">Program Aktif</h2>
                {activeProgram ? (
                    <div>
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-red-600">{activeProgram.name}</h3>
                                <p><b>Hadiah:</b> {activeProgram.prize} | <b>Periode:</b> {activeProgram.period}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleExport} className="neu-button !w-auto px-4"><Icon path={ICONS.download} className="w-5 h-5"/></button>
                                {!isReadOnly && <button onClick={handleDrawWinner} className="neu-button text-red-600 !w-auto px-4 flex items-center gap-2">Lakukan Undian</button>}
                            </div>
                        </div>
                        <div className="mt-6 pt-4 border-t">
                             <h4 className="font-bold mb-4">Rekap Kupon Peserta</h4>

                             {tapChartData.stats.length > 0 && (
                                <div className="mb-6 p-4 neu-card-flat">
                                     <h5 className="font-semibold text-gray-700 mb-4 text-center">Grafik Partisipasi per TAP</h5>
                                     <div className="overflow-x-auto">
                                        <div className="flex justify-around items-end h-48 pt-4 space-x-2 border-b border-gray-200 min-w-[600px]">
                                            {tapChartData.stats.map(({ tap, outletCount, couponCount }) => (
                                                <div key={tap} className="flex flex-col items-center justify-end flex-1 h-full">
                                                    <div className="text-xs font-bold text-gray-800 -mb-4 z-10">{outletCount}</div>
                                                    <div 
                                                        className="w-full bg-gradient-to-t from-red-600 to-red-500 rounded-t-md transition-all duration-500 ease-out"
                                                        style={{ height: `${(outletCount / tapChartData.maxCount) * 100}%` }}
                                                        title={`${outletCount} Mitra | ${couponCount.toLocaleString('id-ID')} Kupon`}
                                                    ></div>
                                                    <div className="text-center mt-1 w-full"><p className="font-bold text-gray-600 text-sm truncate">{tap}</p></div>
                                                </div>
                                            ))}
                                        </div>
                                     </div>
                                </div>
                             )}

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 neu-card-flat">
                                <input type="text" placeholder="Cari nama atau ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-field md:col-span-2" />
                                <select value={tapFilter} onChange={e => setTapFilter(e.target.value)} className="input-field"><option value="">Semua TAP</option>{allTaps.map(t => <option key={t} value={t}>{t}</option>)}</select>
                                <select value={salesforceFilter} onChange={e => setSalesforceFilter(e.target.value)} className="input-field"><option value="">Semua Salesforce</option>{allSalesforce.map(s => <option key={s} value={s}>{s}</option>)}</select>
                            </div>
                             <div className="neu-inset overflow-y-auto max-h-[40vh]">
                                <table className="w-full text-left min-w-[600px]">
                                    <thead className="sticky top-0 bg-slate-200/80 backdrop-blur-sm">
                                        <tr>
                                            <th className="p-3 font-semibold">Nama Mitra</th>
                                            <th className="p-3 font-semibold">Salesforce / TAP</th>
                                            <th className="p-3 font-semibold text-right">Jumlah Kupon</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredParticipants.map(({ user, couponCount }) => user && (
                                            <tr key={user.id} className="border-t border-slate-200/80">
                                                <td className="p-3"><p className="font-semibold">{user.profile.nama}</p><p className="text-xs font-mono text-gray-500">{user.id}</p></td>
                                                <td className="p-3"><p className="font-semibold">{user.profile.salesforce}</p><p className="text-xs text-gray-500">{user.profile.tap}</p></td>
                                                <td className="p-3 text-right font-bold text-red-600 text-lg">{couponCount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredParticipants.length === 0 && <p className="p-8 text-center text-gray-500">Tidak ada peserta yang cocok.</p>}
                            </div>
                        </div>
                    </div>
                ) : <p className="text-center text-gray-500 py-8">Tidak ada program undian yang sedang aktif.</p>}
            </div>

            {/* Program Management Section */}
            <div className="neu-card p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-700">Semua Program</h2>
                    {!isReadOnly && <button onClick={() => { setEditingProgram(undefined); setShowFormModal(true); }} className="neu-button !w-auto px-4 flex items-center gap-2"><Icon path={ICONS.plus} className="w-5 h-5"/>Tambah</button>}
                </div>
                 <div className="space-y-4">
                    {programs.map(p => (
                        <div key={p.id} className={`neu-card-flat p-4 ${p.isActive ? 'border-l-4 border-green-500' : ''}`}>
                             <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-lg">{p.name} {p.isActive && <span className="text-xs bg-green-200 text-green-800 font-bold px-2 py-1 rounded-full ml-2">AKTIF</span>}</p>
                                    <p className="text-sm text-gray-600">{p.prize} | {p.period}</p>
                                </div>
                                {!isReadOnly && (
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEditingProgram(p); setShowFormModal(true); }} className="neu-button-icon text-blue-600"><Icon path={ICONS.edit} className="w-5 h-5"/></button>
                                        <button onClick={() => handleDeleteProgram(p.id)} className="neu-button-icon text-red-600"><Icon path={ICONS.trash} className="w-5 h-5"/></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ManajemenUndian;