import React, { useState, useMemo } from 'react';
import { RunningProgram, PrizeCategory, User } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import Modal from '../../components/common/Modal';

// --- Form Component ---
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

const UploadProgressModal: React.FC<{
    program: RunningProgram;
    onClose: () => void;
    onUpload: (file: File) => void;
}> = ({ program, onClose, onUpload }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUploadClick = () => {
        if (selectedFile) {
            onUpload(selectedFile);
        }
    };

    return (
        <Modal show={true} onClose={onClose} title={`Upload Progres: ${program.name}`}>
            <div>
                <p className="mb-4">Pastikan file Excel Anda memiliki kolom berikut dengan urutan yang benar:</p>
                <div className="bg-gray-100 p-3 rounded-lg text-sm font-mono mb-4">
                    id_digipos, progress
                </div>
                
                <a href="/template_progress.xlsx" download className="neu-button !w-auto px-4 flex items-center gap-2 mb-6">
                    <Icon path={ICONS.download} className="w-5 h-5"/>
                    Download Template
                </a>

                <div className="mb-6">
                    <label className="block text-gray-600 text-sm font-semibold mb-2">Pilih File Excel</label>
                    <input 
                        type="file" 
                        accept=".xlsx, .xls"
                        onChange={handleFileChange}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                    />
                </div>

                <div className="flex justify-center gap-4">
                    <button onClick={onClose} className="neu-button">Batal</button>
                    <button 
                        onClick={handleUploadClick} 
                        className="neu-button text-red-600"
                        disabled={!selectedFile}
                    >
                        Upload & Proses
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const ManageParticipantsModal: React.FC<{
    program: RunningProgram;
    allUsers: User[];
    onClose: () => void;
    onSave: (participantIds: string[]) => void;
    onBulkUpload: (file: File) => void;
}> = ({ program, allUsers, onClose, onSave, onBulkUpload }) => {
    const [participantIds, setParticipantIds] = useState<Set<string>>(() => new Set(program.targets.map(t => t.userId)));
    const [searchTerm, setSearchTerm] = useState('');
    const [uploadFile, setUploadFile] = useState<File | null>(null);

    const participants = useMemo(() => allUsers.filter(u => participantIds.has(u.id)), [allUsers, participantIds]);
    
    const availableUsers = useMemo(() => {
        const lowercasedSearch = searchTerm.toLowerCase();
        return allUsers.filter(u => 
            !participantIds.has(u.id) &&
            (u.profile.nama.toLowerCase().includes(lowercasedSearch) || u.id.toLowerCase().includes(lowercasedSearch))
        );
    }, [allUsers, participantIds, searchTerm]);
    
    const toggleParticipant = (userId: string) => {
        setParticipantIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(userId)) {
                newSet.delete(userId);
            } else {
                newSet.add(userId);
            }
            return newSet;
        });
    };

    const handleAddAll = () => {
        setParticipantIds(prev => new Set([...prev, ...availableUsers.map(u => u.id)]));
    };

    const handleRemoveAll = () => {
        setParticipantIds(new Set());
    };

    const handleSave = () => {
        onSave(Array.from(participantIds));
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadFile(e.target.files[0]);
        } else {
            setUploadFile(null);
        }
    };

    const handleUploadClick = () => {
        if (uploadFile) {
            onBulkUpload(uploadFile);
        }
    };


    return (
        <Modal show={true} onClose={onClose} title={`Kelola Peserta: ${program.name}`}>
            <div className="grid grid-cols-2 gap-6 h-[50vh]">
                {/* Registered Participants */}
                <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-gray-700">Peserta Terdaftar ({participants.length})</h4>
                        <button onClick={handleRemoveAll} className="text-xs font-semibold text-red-600 hover:underline">Hapus Semua</button>
                    </div>
                    <div className="neu-inset p-2 flex-grow overflow-y-auto">
                        {participants.length > 0 ? participants.map(user => (
                            <div key={user.id} onClick={() => toggleParticipant(user.id)} className="p-2 rounded-lg cursor-pointer hover:bg-red-100 flex justify-between items-center text-sm">
                                <span className="font-semibold">{user.profile.nama}</span>
                                <Icon path={ICONS.chevronRight} className="w-5 h-5 text-red-500 flex-shrink-0"/>
                            </div>
                        )) : <p className="text-center text-sm text-gray-500 p-4">Belum ada peserta.</p>}
                    </div>
                </div>
                {/* Available Partners */}
                <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-gray-700">Mitra Tersedia</h4>
                        <button onClick={handleAddAll} className="text-xs font-semibold text-green-600 hover:underline" disabled={availableUsers.length === 0}>Pilih Semua</button>
                    </div>
                    <input 
                        type="text"
                        placeholder="Cari mitra..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="input-field mb-2"
                    />
                    <div className="neu-inset p-2 flex-grow overflow-y-auto">
                        {availableUsers.map(user => (
                             <div key={user.id} onClick={() => toggleParticipant(user.id)} className="p-2 rounded-lg cursor-pointer hover:bg-green-100 flex items-center text-sm">
                                 <Icon path={ICONS.chevronLeft} className="w-5 h-5 text-green-500 flex-shrink-0 mr-2"/>
                                <span className="font-semibold">{user.profile.nama}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
             <div className="flex justify-center gap-4 mt-6">
                <button onClick={onClose} className="neu-button">Batal</button>
                <button onClick={handleSave} className="neu-button text-red-600">Simpan Perubahan</button>
            </div>
             <div className="mt-6 pt-6 border-t border-gray-200/80">
                <h4 className="text-lg font-bold text-gray-700 mb-2">Upload Cepat</h4>
                <p className="text-sm text-gray-500 mb-4">Ganti semua peserta dengan daftar dari file Excel. File harus memiliki satu kolom: <b>id_digipos</b>.</p>
                 <a href="/template_peserta.xlsx" download className="text-sm font-semibold text-red-600 hover:underline inline-block mb-4">Download Template</a>
                <div className="flex items-center gap-4">
                     <input 
                        type="file" 
                        accept=".xlsx, .xls"
                        onChange={handleFileChange}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                    />
                    <button 
                        onClick={handleUploadClick}
                        disabled={!uploadFile}
                        className="neu-button !w-auto px-4"
                    >
                        Upload
                    </button>
                </div>
            </div>
        </Modal>
    );
};


interface ManajemenProgramProps {
    programs: RunningProgram[];
    allUsers: User[];
    onSave: (programData: Omit<RunningProgram, 'id' | 'targets'> & { id?: number }, photoFile: File | null) => void;
    onDelete: (id: number) => void;
    adminBulkUpdateProgramProgress: (programId: number, file: File) => void;
    adminUpdateProgramParticipants: (programId: number, participantIds: string[]) => void;
    adminBulkAddProgramParticipants: (programId: number, file: File) => void;
    isReadOnly?: boolean;
}

const ManajemenProgram: React.FC<ManajemenProgramProps> = ({ programs, allUsers, onSave, onDelete, adminBulkUpdateProgramProgress, adminUpdateProgramParticipants, adminBulkAddProgramParticipants, isReadOnly }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingProgram, setEditingProgram] = useState<RunningProgram | undefined>(undefined);
    const [uploadingProgram, setUploadingProgram] = useState<RunningProgram | null>(null);
    const [managingParticipantsProgram, setManagingParticipantsProgram] = useState<RunningProgram | null>(null);
    const [deletingProgram, setDeletingProgram] = useState<RunningProgram | null>(null);

    const handleSave = (programData: Omit<RunningProgram, 'id' | 'targets'> & { id?: number }, photoFile: File | null) => {
        onSave(programData, photoFile);
        setShowModal(false);
        setEditingProgram(undefined);
    };

    const handleConfirmDelete = () => {
        if (deletingProgram) {
            onDelete(deletingProgram.id);
            setDeletingProgram(null);
        }
    };

    const openAddModal = () => {
        setEditingProgram(undefined);
        setShowModal(true);
    };

    const openEditModal = (program: RunningProgram) => {
        setEditingProgram(program);
        setShowModal(true);
    };

    const handleUpload = (file: File) => {
        if (!uploadingProgram) return;
        adminBulkUpdateProgramProgress(uploadingProgram.id, file);
        setUploadingProgram(null);
    };

    const handleSaveParticipants = (participantIds: string[]) => {
        if (!managingParticipantsProgram) return;
        adminUpdateProgramParticipants(managingParticipantsProgram.id, participantIds);
        setManagingParticipantsProgram(null);
    };

    const handleBulkUploadParticipants = (file: File) => {
        if (!managingParticipantsProgram) return;
        adminBulkAddProgramParticipants(managingParticipantsProgram.id, file);
        setManagingParticipantsProgram(null);
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

            {managingParticipantsProgram && (
                <ManageParticipantsModal
                    program={managingParticipantsProgram}
                    allUsers={allUsers}
                    onClose={() => setManagingParticipantsProgram(null)}
                    onSave={handleSaveParticipants}
                    onBulkUpload={handleBulkUploadParticipants}
                />
            )}
            
            {deletingProgram && (
                <Modal show={true} onClose={() => setDeletingProgram(null)} title="Konfirmasi Hapus">
                    <div>
                        <p className="text-center mb-6">Anda yakin ingin menghapus program <b>{deletingProgram.name}</b>? Semua data progres peserta terkait program ini juga akan dihapus.</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setDeletingProgram(null)} className="neu-button">Batal</button>
                            <button onClick={handleConfirmDelete} className="neu-button text-red-600">Ya, Hapus</button>
                        </div>
                    </div>
                </Modal>
            )}


            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-700">Manajemen Program Berjalan</h1>
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
                                    <div className="flex gap-2 flex-wrap justify-end">
                                        <button title="Kelola Peserta" onClick={() => setManagingParticipantsProgram(p)} className="neu-button-icon text-purple-600"><Icon path={ICONS.users} className="w-5 h-5"/></button>
                                        <button title="Upload Pencapaian" onClick={() => setUploadingProgram(p)} className="neu-button-icon text-green-600"><Icon path={ICONS.upload} className="w-5 h-5"/></button>
                                        <button title="Edit Program" onClick={() => openEditModal(p)} className="neu-button-icon text-blue-600"><Icon path={ICONS.edit} className="w-5 h-5"/></button>
                                        <button title="Hapus Program" onClick={() => setDeletingProgram(p)} className="neu-button-icon text-red-600"><Icon path={ICONS.trash} className="w-5 h-5"/></button>
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