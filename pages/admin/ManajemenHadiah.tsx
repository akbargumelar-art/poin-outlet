import React, { useState } from 'react';
import { Reward } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import Modal from '../../components/common/Modal';

// --- Reward Form Component ---
interface RewardFormProps {
    reward?: Reward;
    onSave: (reward: Reward) => void;
    onCancel: () => void;
}

const RewardForm: React.FC<RewardFormProps> = ({ reward, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Omit<Reward, 'id'> & { id?: number }>(
        reward || { name: '', points: 0, image: '', stock: 0 }
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value, 10) || 0 : value }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalReward: Reward = {
            ...formData,
            id: formData.id || Date.now(),
        };
        onSave(finalReward);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Nama Hadiah" className="input-field" required />
            <input name="points" type="number" value={formData.points} onChange={handleChange} placeholder="Poin Dibutuhkan" className="input-field" required />
            <input name="stock" type="number" value={formData.stock} onChange={handleChange} placeholder="Jumlah Stok" className="input-field" required />
            <input name="image" value={formData.image} onChange={handleChange} placeholder="URL Gambar (e.g., https://placehold.co/...)" className="input-field" required />
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
    addReward: (reward: Reward) => void;
    updateReward: (reward: Reward) => void;
    deleteReward: (rewardId: number) => void;
    isReadOnly?: boolean;
}

const ManajemenHadiah: React.FC<ManajemenHadiahProps> = ({ rewards, addReward, updateReward, deleteReward, isReadOnly }) => {
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingReward, setEditingReward] = useState<Reward | undefined>(undefined);
    const [deletingReward, setDeletingReward] = useState<Reward | null>(null);

    const handleOpenAdd = () => {
        setEditingReward(undefined);
        setShowFormModal(true);
    };

    const handleOpenEdit = (reward: Reward) => {
        setEditingReward(reward);
        setShowFormModal(true);
    };

    const handleSave = (reward: Reward) => {
        if (editingReward) {
            updateReward(reward);
        } else {
            addReward(reward);
        }
        setShowFormModal(false);
        setEditingReward(undefined);
    };

    const handleConfirmDelete = () => {
        if (deletingReward) {
            deleteReward(deletingReward.id);
            setDeletingReward(null);
        }
    };

    return (
        <div>
            {showFormModal && (
                <Modal show={true} onClose={() => setShowFormModal(false)} title={editingReward ? 'Edit Hadiah' : 'Tambah Hadiah Baru'}>
                    <RewardForm reward={editingReward} onSave={handleSave} onCancel={() => setShowFormModal(false)} />
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
                <h1 className="text-3xl font-bold text-gray-700">Manajemen Hadiah</h1>
                {!isReadOnly && (
                    <button onClick={handleOpenAdd} className="neu-button !w-auto px-6 flex items-center gap-2">
                        <Icon path={ICONS.plus} className="w-5 h-5"/>Tambah Hadiah
                    </button>
                )}
            </div>
            
            <div className="neu-card-flat overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-slate-200/50">
                        <tr>
                            <th className="p-4 font-semibold">Gambar</th>
                            <th className="p-4 font-semibold">Nama Hadiah</th>
                            <th className="p-4 font-semibold">Poin</th>
                            <th className="p-4 font-semibold">Stok</th>
                            <th className="p-4 font-semibold">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rewards.map(r => (
                            <tr key={r.id} className="border-t border-slate-200/80">
                                <td className="p-4"><img src={r.image} alt={r.name} className="w-16 h-12 object-cover rounded-md neu-inset p-1"/></td>
                                <td className="p-4 font-semibold">{r.name}</td>
                                <td className="p-4 font-bold text-red-600">{r.points.toLocaleString('id-ID')}</td>
                                <td className="p-4">{r.stock}</td>
                                <td className="p-4">
                                    {!isReadOnly ? (
                                        <div className="flex gap-2">
                                            <button onClick={() => handleOpenEdit(r)} className="neu-button-icon text-blue-600"><Icon path={ICONS.edit} className="w-5 h-5"/></button>
                                            <button onClick={() => setDeletingReward(r)} className="neu-button-icon text-red-600"><Icon path={ICONS.trash} className="w-5 h-5"/></button>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 text-sm">N/A</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ManajemenHadiah;