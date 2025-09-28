import React, { useState } from 'react';
import { RunningProgram, User, RunningProgramTarget } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import Modal from '../../components/common/Modal';

interface ProgramFormProps {
    program?: RunningProgram;
    onSave: (program: RunningProgram) => void;
    onCancel: () => void;
}

const ProgramForm: React.FC<ProgramFormProps> = ({ program, onSave, onCancel }) => {
    const [formData, setFormData] = useState(program || { id: Date.now(), name: '', mechanism: '', prize: '', period: '', targets: [] });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Nama Program" className="input-field" required />
            <input name="period" value={formData.period} onChange={handleChange} placeholder="Periode (e.g., 1 Jan - 31 Jan 2025)" className="input-field" required />
            <input name="prize" value={formData.prize} onChange={handleChange} placeholder="Hadiah Utama" className="input-field" required />
            <textarea name="mechanism" value={formData.mechanism} onChange={handleChange} placeholder="Mekanisme Program" className="input-field min-h-[100px]" required />
            <div className="flex gap-4">
                <button type="button" onClick={onCancel} className="neu-button">Batal</button>
                <button type="submit" className="neu-button text-red-600">Simpan</button>
            </div>
        </form>
    );
};

const UploadProgressModal: React.FC<{program: RunningProgram, onClose: () => void, onUpload: () => void}> = ({ program, onClose, onUpload }) => {
    return (
        <Modal show={true} onClose={onClose} title={`Upload Progres: ${program.name}`}>
            <div>
                <p className="mb-4">Pastikan file Excel Anda memiliki kolom berikut dengan urutan yang benar:</p>
                <div className="bg-gray-100 p-3 rounded-lg text-sm font-mono mb-6">
                    id_digipos, progress
                </div>
                <p className="text-center text-sm mb-6">Fitur ini akan menyimulasikan proses upload dan memperbarui progres peserta yang terdaftar.</p>
                <div className="flex justify-center gap-4">
                    <button onClick={onClose} className="neu-button">Batal</button>
                    <button onClick={onUpload} className="neu-button text-red-600">Proses Upload (Simulasi)</button>
                </div>
            </div>
        </Modal>
    );
};


interface ManajemenProgramProps {
    programs: RunningProgram[];
    setPrograms: React.Dispatch<React.SetStateAction<RunningProgram[]>>;
    adminBulkUpdateProgramProgress: (programId: number, progressData: { userId: string, progress: number }[]) => void;
    isReadOnly?: boolean;
}

const ManajemenProgram: React.FC<ManajemenProgramProps> = ({ programs, setPrograms, adminBulkUpdateProgramProgress, isReadOnly }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingProgram, setEditingProgram] = useState<RunningProgram | undefined>(undefined);
    const [uploadingProgram, setUploadingProgram] = useState<RunningProgram | null>(null);

    const handleSave = (program: RunningProgram) => {
        if (programs.find(p => p.id === program.id)) {
            setPrograms(programs.map(p => p.id === program.id ? {...p, ...program, targets: p.targets} : p));
        } else {
            setPrograms([...programs, program]);
        }
        setShowModal(false);
        setEditingProgram(undefined);
    };

    const handleDelete = (id: number) => {
        setPrograms(programs.filter(p => p.id !== id));
    };

    const openAddModal = () => {
        setEditingProgram(undefined);
        setShowModal(true);
    };

    const openEditModal = (program: RunningProgram) => {
        setEditingProgram(program);
        setShowModal(true);
    };

    const handleUpload = () => {
        if (!uploadingProgram) return;
        // Simulate data from an uploaded file for existing participants
        const MOCK_PROGRESS_DATA = [
            { userId: 'DG12345', progress: 88 }, // Will update existing
            { userId: 'DG67890', progress: 72 }, // Will update existing
            { userId: 'NEW_USER_ID', progress: 50 }, // Will be ignored as not a participant
        ];
        adminBulkUpdateProgramProgress(uploadingProgram.id, MOCK_PROGRESS_DATA);
        setUploadingProgram(null);
    };


    return (
        <div>
            {showModal && <Modal show={showModal} onClose={() => setShowModal(false)} title={editingProgram ? 'Edit Program' : 'Tambah Program Baru'}><ProgramForm program={editingProgram} onSave={handleSave} onCancel={() => setShowModal(false)} /></Modal>}
            
            {uploadingProgram && (
                <UploadProgressModal
                    program={uploadingProgram}
                    onClose={() => setUploadingProgram(null)}
                    onUpload={handleUpload}
                />
            )}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-700">Manajemen Program Berjalan</h1>
                {!isReadOnly && <button onClick={openAddModal} className="neu-button !w-auto px-6 flex items-center gap-2"><Icon path={ICONS.plus} className="w-5 h-5" />Tambah</button>}
            </div>

            <div className="space-y-6">
                {programs.map(p => (
                    <div key={p.id} className="neu-card p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">{p.name}</h3>
                                <p className="text-sm text-gray-500 bg-slate-200/50 inline-block px-2 py-1 rounded-md mt-1">{p.period}</p>
                            </div>
                            {!isReadOnly && (
                                <div className="flex gap-2">
                                    <button title="Upload Pencapaian" onClick={() => setUploadingProgram(p)} className="neu-button-icon text-green-600"><Icon path={ICONS.upload} className="w-5 h-5"/></button>
                                    <button title="Edit Program" onClick={() => openEditModal(p)} className="neu-button-icon text-blue-600"><Icon path={ICONS.edit} className="w-5 h-5"/></button>
                                    <button title="Hapus Program" onClick={() => handleDelete(p.id)} className="neu-button-icon text-red-600"><Icon path={ICONS.trash} className="w-5 h-5"/></button>
                                </div>
                            )}
                        </div>
                        <p className="text-gray-700 mt-4">{p.mechanism}</p>
                        <p className="text-md font-semibold text-gray-800 mt-4">Hadiah: <span className="font-bold text-red-600">{p.prize}</span></p>
                         <p className="text-sm font-semibold text-gray-800 mt-2">Peserta: <span className="font-bold text-gray-600">{p.targets.length} Mitra</span></p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ManajemenProgram;