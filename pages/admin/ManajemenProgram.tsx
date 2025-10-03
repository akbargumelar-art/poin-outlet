
import React, { useState } from 'react';
import { RunningProgram, PrizeCategory } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import Modal from '../../components/common/Modal';

interface ProgramFormProps {
    program?: Omit<RunningProgram, 'targets'>;
    onSave: (programData: Omit<RunningProgram, 'id' | 'targets'> & { id?: number }, photoFile: File | null) => void;
    onCancel: () => void;
}

const ProgramForm: React.FC<ProgramFormProps> = ({ program, onSave, onCancel }) => {
    const [formData, setFormData] = useState(program || { 
        name: '', 
        mechanism: '', 
        prizeCategory: 'Barang' as PrizeCategory,
        prizeDescription: '', 
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        imageUrl: '',
    });
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(program?.imageUrl || null);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Nama Program" className="input-field" required />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-semibold text-gray-600 mb-1 block">Tanggal Mulai</label>
                    <input name="startDate" type="date" value={formData.startDate} onChange={handleChange} className="input-field" required />
                </div>
                 <div>
                    <label className="text-sm font-semibold text-gray-600 mb-1 block">Tanggal Selesai</label>
                    <input name="endDate" type="date" value={formData.endDate} onChange={handleChange} className="input-field" required />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                     <label className="text-sm font-semibold text-gray-600 mb-1 block">Kategori Hadiah</label>
                     <select name="prizeCategory" value={formData.prizeCategory} onChange={handleChange} className="input-field">
                        <option value="Barang">Barang</option>
                        <option value="Uang Tunai">Uang Tunai</option>
                        <option value="Saldo">Saldo</option>
                     </select>
                </div>
                <div>
                    <label className="text-sm font-semibold text-gray-600 mb-1 block">Deskripsi Hadiah</label>
                    <input name="prizeDescription" value={formData.prizeDescription} onChange={handleChange} placeholder="e.g., iPhone 15 atau 5.000.000" className="input-field" required />
                </div>
            </div>
             <div>
                 <label className="block text-gray-600 text-sm font-semibold mb-2">Key Visual Program (Potrait)</label>
                 <div className="flex items-center gap-4">
                     {photoPreview && <img src={photoPreview} alt="Preview" className="w-20 h-28 object-cover rounded-lg neu-inset p-1" />}
                     <label htmlFor="program-photo-upload" className="neu-button !w-auto px-4 cursor-pointer">Pilih File</label>
                     <input id="program-photo-upload" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                 </div>
            </div>
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
    onSave: (programData: Omit<RunningProgram, 'id' | 'targets'> & { id?: number }, photoFile: File | null) => void;
    adminBulkUpdateProgramProgress: (programId: number, progressData: { userId: string, progress: number }[]) => void;
    isReadOnly?: boolean;
}

const ManajemenProgram: React.FC<ManajemenProgramProps> = ({ programs, onSave, adminBulkUpdateProgramProgress, isReadOnly }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingProgram, setEditingProgram] = useState<RunningProgram | undefined>(undefined);
    const [uploadingProgram, setUploadingProgram] = useState<RunningProgram | null>(null);

    const handleSave = (programData: Omit<RunningProgram, 'id' | 'targets'> & { id?: number }, photoFile: File | null) => {
        onSave(programData, photoFile);
        setShowModal(false);
        setEditingProgram(undefined);
    };

    const handleDelete = (id: number) => {
        // This should be an API call in a real app
        alert(`Simulasi: Hapus program dengan ID ${id}.`);
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
    
    const formatDateRange = (start: string, end: string) => {
        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
        const startDate = new Date(start).toLocaleDateString('id-ID', options);
        const endDate = new Date(end).toLocaleDateString('id-ID', options);
        return `${startDate} - ${endDate}`;
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
                    <div key={p.id} className="neu-card p-6 flex flex-col md:flex-row gap-6">
                        <img src={p.imageUrl} alt={p.name} className="w-full md:w-32 h-48 md:h-32 object-cover rounded-lg neu-inset p-1 flex-shrink-0"/>
                        <div className="flex-grow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">{p.name}</h3>
                                    <p className="text-sm text-gray-500 bg-slate-200/50 inline-block px-2 py-1 rounded-md mt-1">{formatDateRange(p.startDate, p.endDate)}</p>
                                </div>
                                {!isReadOnly && (
                                    <div className="flex gap-2">
                                        <button title="Upload Pencapaian" onClick={() => setUploadingProgram(p)} className="neu-button-icon text-green-600"><Icon path={ICONS.upload} className="w-5 h-5"/></button>
                                        <button title="Edit Program" onClick={() => openEditModal(p)} className="neu-button-icon text-blue-600"><Icon path={ICONS.edit} className="w-5 h-5"/></button>
                                        <button title="Hapus Program" onClick={() => handleDelete(p.id)} className="neu-button-icon text-red-600"><Icon path={ICONS.trash} className="w-5 h-5"/></button>
                                    </div>
                                )}
                            </div>
                            <p className="text-gray-700 mt-2">{p.mechanism}</p>
                            <p className="text-md font-semibold text-gray-800 mt-2">Hadiah: <span className="font-bold text-red-600">{p.prizeDescription} ({p.prizeCategory})</span></p>
                             <p className="text-sm font-semibold text-gray-800 mt-1">Peserta: <span className="font-bold text-gray-600">{p.targets.length} Mitra</span></p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ManajemenProgram;