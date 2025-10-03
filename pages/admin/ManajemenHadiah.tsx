
import React, { useState } from 'react';
import { Reward, LoyaltyProgram } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import Modal from '../../components/common/Modal';

// --- Level Form Component ---
interface LevelFormProps {
    level: LoyaltyProgram;
    onSave: (level: LoyaltyProgram) => void;
    onCancel: () => void;
}
const LevelForm: React.FC<LevelFormProps> = ({ level, onSave, onCancel }) => {
    const [formData, setFormData] = useState(level);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'pointsNeeded' || name === 'multiplier' ? parseFloat(value) : value }));
    };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-gray-600 text-sm font-semibold mb-1">Level</label><input value={formData.level} className="input-field-disabled" readOnly /></div>
            <div><label className="block text-gray-600 text-sm font-semibold mb-1">Poin Dibutuhkan</label><input type="number" name="pointsNeeded" value={formData.pointsNeeded} onChange={handleChange} className="input-field" required /></div>
            <div><label className="block text-gray-600 text-sm font-semibold mb-1">Pengali Poin (e.g., 1.2 untuk 1.2x)</label><input type="number" step="0.1" name="multiplier" value={formData.multiplier} onChange={handleChange} className="input-field" required /></div>
            <div><label className="block text-gray-600 text-sm font-semibold mb-1">Deskripsi Keuntungan</label><textarea name="benefit" value={formData.benefit} onChange={handleChange} className="input-field" required /></div>
            <div className="flex gap-4 pt-4"><button type="button" onClick={onCancel} className="neu-button">Batal</button><button type="submit" className="neu-button text-red-600">Simpan Perubahan</button></div>
        </form>
    );
};


// --- Reward Form Component ---
interface RewardFormProps {
    reward?: Reward;
    onSave: (rewardData: Omit<Reward, 'id'> & { id?: number }, photoFile: File | null) => void;
    onCancel: () => void;
}

const RewardForm: React.FC<RewardFormProps> = ({ reward, onSave, onCancel }) => {
    const [formData, setFormData] = useState(
        reward || { name: '', points: 0, imageUrl: '', stock: 0 }
    );
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(reward?.imageUrl || null);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value, 10) || 0 : value }));
    };
    
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData, photoFile);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Nama Hadiah" className="input-field" required />
            <input name="points" type="number" value={formData.points} onChange={handleChange} placeholder="Poin Dibutuhkan" className="input-field" required />
            <input name="stock" type="number" value={formData.stock} onChange={handleChange} placeholder="Jumlah Stok" className="input-field" required />
            
            <div>
                 <label className="block text-gray-600 text-sm font-semibold mb-2">Gambar Hadiah</label>
                 <div className="flex items-center gap-4">
                     {photoPreview && <img src={photoPreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg neu-inset p-1" />}
                     <label htmlFor="photo-upload" className="neu-button !w-auto px-4 cursor-pointer">Pilih File</label>
                     <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                 </div>
            </div>

            <div className="flex gap-4 pt-4">
                <button type="button" onClick={onCancel} className="neu-button">Batal</button>
                <button type="submit" className="neu-button text-red-600">Simpan Hadiah</button>
            </div>
        </form>
    );
};

// --- Main Component ---
interface ManajemenHadiahProps {
    rewards: Reward[];
    onSave: (rewardData: Omit<Reward, 'id'> & { id?: number }, photoFile: File | null) => void;
    deleteReward: (rewardId: number) => void;
    isReadOnly?: boolean;
    loyaltyPrograms: LoyaltyProgram[];
    updateLoyaltyProgram: (program: LoyaltyProgram) => void;
}

const ManajemenHadiah: React.FC<ManajemenHadiahProps> = ({ rewards, onSave, deleteReward, isReadOnly, loyaltyPrograms, updateLoyaltyProgram }) => {
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingReward, setEditingReward] = useState<Reward | undefined>(undefined);
    const [deletingReward, setDeletingReward] = useState<Reward | null>(null);
    const [editingLevel, setEditingLevel] = useState<LoyaltyProgram | null>(null);

    const handleOpenAdd = () => {
        setEditingReward(undefined);
        setShowFormModal(true);
    };

    const handleOpenEdit = (reward: Reward) => {
        setEditingReward(reward);
        setShowFormModal(true);
    };

    const handleSave = (rewardData: Omit<Reward, 'id'> & { id?: number }, photoFile: File | null) => {
        onSave(rewardData, photoFile);
        setShowFormModal(false);
        setEditingReward(undefined);
    };

    const handleConfirmDelete = () => {
        if (deletingReward) {
            deleteReward(deletingReward.id);
            setDeletingReward(null);
        }
    };

    const handleSaveLevel = (level: LoyaltyProgram) => {
        updateLoyaltyProgram(level);
        setEditingLevel(null);
    };

    const levelCardStyles: { [key: string]: string } = {
        Bronze: 'bg-amber-100/50 border-amber-600',
        Silver: 'bg-slate-200/50 border-slate-500',
        Gold: 'bg-yellow-100/50 border-yellow-500',
        Platinum: 'bg-cyan-100/50 border-cyan-500',
    };

    return (
        <div>
            {showFormModal && (
                <Modal show={true} onClose={() => setShowFormModal(false)} title={editingReward ? 'Edit Hadiah' : 'Tambah Hadiah Baru'}>
                    <RewardForm reward={editingReward} onSave={handleSave} onCancel={() => setShowFormModal(false)} />
                </Modal>
            )}

            {editingLevel && (
                <Modal show={true} onClose={() => setEditingLevel(null)} title={`Edit Level: ${editingLevel.level}`}>
                    <LevelForm level={editingLevel} onSave={handleSaveLevel} onCancel={() => setEditingLevel(null)} />
                </Modal>
            )}

            {deletingReward && (
                <Modal show={true} onClose={() => setDeletingReward(null)} title="Konfirmasi Hapus">
                    <div>
                        <p className="text-center mb-6">Anda yakin ingin menghapus hadiah <b>{deletingReward.name}</b>?</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setDeletingReward(null)} className="neu-button">Batal</button>
                            <button onClick={handleConfirmDelete} className="neu-button text-red-600">Ya, Hapus</button>
                        </div>
                    </div>
                </Modal>
            )}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-700">Manajemen Hadiah & Level</h1>
                {!isReadOnly && (
                    <button onClick={handleOpenAdd} className="neu-button !w-auto px-6 flex items-center gap-2">
                        <Icon path={ICONS.plus} className="w-5 h-5"/>Tambah Hadiah
                    </button>
                )}
            </div>
            
            <div className="neu-card p-6 mb-8">
                <h2 className="text-xl font-bold text-gray-700 mb-4">Aturan Level Loyalitas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {loyaltyPrograms.map(level => (
                        <div key={level.level} className={`neu-card-flat p-4 flex justify-between items-center border-l-4 ${levelCardStyles[level.level] || 'border-gray-400'}`}>
                            <div>
                                <p className="font-bold text-lg text-gray-800">{level.level}</p>
                                <p className="text-sm text-gray-500">Min: {level.pointsNeeded.toLocaleString('id-ID')} Poin | Pengali: {level.multiplier}x</p>
                                <p className="text-xs text-gray-600 mt-1">{level.benefit}</p>
                            </div>
                            {!isReadOnly && (
                                <button onClick={() => setEditingLevel(level)} className="neu-button-icon text-blue-600 flex-shrink-0">
                                    <Icon path={ICONS.edit} className="w-5 h-5"/>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="neu-card-flat overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-slate-200/50">
                        <tr>
                            <th className="p-4 font-semibold">Gambar</th>
                            <th className="p-4 font-semibold">Nama Hadiah</th>
                            <th className="p-4 font-semibold">Poin</th>
                            <th className="p-4 font-semibold">Stok</th>
                            {!isReadOnly && <th className="p-4 font-semibold">Aksi</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {rewards.map(r => (
                            <tr key={r.id} className="border-t border-slate-200/80">
                                <td className="p-4"><img src={r.imageUrl} alt={r.name} className="w-16 h-12 object-cover rounded-md neu-inset p-1"/></td>
                                <td className="p-4 font-semibold">{r.name}</td>
                                <td className="p-4 font-bold text-red-600">{r.points.toLocaleString('id-ID')}</td>
                                <td className="p-4">{r.stock}</td>
                                {!isReadOnly && (
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <button onClick={() => handleOpenEdit(r)} className="neu-button-icon text-blue-600"><Icon path={ICONS.edit} className="w-5 h-5"/></button>
                                            <button onClick={() => setDeletingReward(r)} className="neu-button-icon text-red-600"><Icon path={ICONS.trash} className="w-5 h-5"/></button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ManajemenHadiah;