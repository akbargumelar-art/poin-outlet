
import React, { useState } from 'react';
import { RunningProgram } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import Modal from '../../components/common/Modal';

interface ManajemenProgramProps {
    programs: RunningProgram[];
    setPrograms: React.Dispatch<React.SetStateAction<RunningProgram[]>>;
}

const ProgramForm: React.FC<{program?: RunningProgram, onSave: (program: RunningProgram) => void, onCancel: () => void}> = ({ program, onSave, onCancel }) => {
    const [formData, setFormData] = useState(program || { id: Date.now(), name: '', mechanism: '', prize: '', period: '', targets: [] });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({...prev, [e.target.name]: e.target.value}));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Nama Program" className="input-field" required/>
            <input name="period" value={formData.period} onChange={handleChange} placeholder="Periode (e.g., 1 Jan - 31 Jan 2025)" className="input-field" required/>
            <input name="prize" value={formData.prize} onChange={handleChange} placeholder="Hadiah Utama" className="input-field" required/>
            <textarea name="mechanism" value={formData.mechanism} onChange={handleChange} placeholder="Mekanisme Program" className="input-field min-h-[100px]" required/>
            <div className="flex gap-4">
                <button type="button" onClick={onCancel} className="neu-button">Batal</button>
                <button type="submit" className="neu-button text-red-600">Simpan</button>
            </div>
        </form>
    );
};

const ManajemenProgram: React.FC<ManajemenProgramProps> = ({ programs, setPrograms }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingProgram, setEditingProgram] = useState<RunningProgram | undefined>(undefined);

    const handleSave = (program: RunningProgram) => {
        if (programs.find(p => p.id === program.id)) {
            setPrograms(programs.map(p => p.id === program.id ? program : p));
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

    return (
        <div>
            {showModal && <Modal show={showModal} onClose={() => setShowModal(false)} title={editingProgram ? 'Edit Program' : 'Tambah Program Baru'}><ProgramForm program={editingProgram} onSave={handleSave} onCancel={() => setShowModal(false)}/></Modal>}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-700">Manajemen Program Berjalan</h1>
                <button onClick={openAddModal} className="neu-button !w-auto px-6 flex items-center gap-2"><Icon path={ICONS.plus} className="w-5 h-5"/>Tambah</button>
            </div>

            <div className="space-y-6">
                 {programs.map(p => (
                    <div key={p.id} className="neu-card p-6">
                        <div className="flex justify-between items-start">
                             <div>
                                <h3 className="text-xl font-bold text-gray-800">{p.name}</h3>
                                <p className="text-sm text-gray-500 bg-slate-200/50 inline-block px-2 py-1 rounded-md mt-1">{p.period}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => openEditModal(p)} className="neu-button-icon text-blue-600"><Icon path={ICONS.edit} className="w-5 h-5"/></button>
                                <button onClick={() => handleDelete(p.id)} className="neu-button-icon text-red-600"><Icon path={ICONS.trash} className="w-5 h-5"/></button>
                            </div>
                        </div>
                         <p className="text-gray-700 mt-4">{p.mechanism}</p>
                         <p className="text-md font-semibold text-gray-800 mt-4">Hadiah: <span className="font-bold text-red-600">{p.prize}</span></p>
                    </div>
                 ))}
            </div>
        </div>
    );
};

export default ManajemenProgram;