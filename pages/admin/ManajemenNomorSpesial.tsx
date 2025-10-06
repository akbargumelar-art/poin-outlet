import React, { useState } from 'react';
import { SpecialNumber } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import Modal from '../../components/common/Modal';

// --- Form Component ---
interface NumberFormProps {
    number?: SpecialNumber;
    onSave: (number: Omit<SpecialNumber, 'id' | 'isSold'> & { id?: number }) => void;
    onCancel: () => void;
}
const NumberForm: React.FC<NumberFormProps> = ({ number, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        phoneNumber: number?.phoneNumber || '',
        price: number?.price || 0,
        sn: number?.sn || '',
        lokasi: number?.lokasi || '',
        id: number?.id
    });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'price' ? parseFloat(value) : value }));
    };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="Nomor Telepon" className="input-field" required />
            <input name="sn" value={formData.sn} onChange={handleChange} placeholder="SN (Serial Number)" className="input-field" />
            <input name="lokasi" value={formData.lokasi} onChange={handleChange} placeholder="Lokasi (e.g., Cirebon)" className="input-field" />
            <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="Harga" className="input-field" required />
            <div className="flex gap-4 pt-4">
                <button type="button" onClick={onCancel} className="neu-button">Batal</button>
                <button type="submit" className="neu-button text-red-600">Simpan</button>
            </div>
        </form>
    );
};

// --- Main Component ---
interface ManajemenNomorProps {
    numbers: SpecialNumber[];
    onSave: (number: Omit<SpecialNumber, 'id' | 'isSold'> & { id?: number }) => void;
    onDelete: (id: number) => void;
    onStatusChange: (id: number, isSold: boolean) => void;
    onBulkUpload: (file: File) => void;
    adminUploadSpecialNumberBanner: (file: File) => void;
}

const ManajemenNomorSpesial: React.FC<ManajemenNomorProps> = ({ numbers, onSave, onDelete, onStatusChange, onBulkUpload, adminUploadSpecialNumberBanner }) => {
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingNumber, setEditingNumber] = useState<SpecialNumber | undefined>(undefined);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);

    const handleSave = (numberData: Omit<SpecialNumber, 'id' | 'isSold'> & { id?: number }) => {
        onSave(numberData);
        setShowFormModal(false);
    };

    const handleConfirmDelete = () => {
        if (deletingId) {
            onDelete(deletingId);
            setDeletingId(null);
        }
    };
    
    const handleFileUpload = () => {
        if (uploadFile) {
            onBulkUpload(uploadFile);
            setShowUploadModal(false);
            setUploadFile(null);
        }
    };
    
    const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            adminUploadSpecialNumberBanner(e.target.files[0]);
        }
    };


    return (
        <div>
            {showFormModal && <Modal show={true} onClose={() => setShowFormModal(false)} title={editingNumber ? 'Edit Nomor' : 'Tambah Nomor Baru'}><NumberForm number={editingNumber} onSave={handleSave} onCancel={() => setShowFormModal(false)} /></Modal>}
            {deletingId && <Modal show={true} onClose={() => setDeletingId(null)} title="Konfirmasi Hapus"><div className="text-center"><p className="mb-6">Yakin ingin menghapus nomor ini?</p><div className="flex gap-4 justify-center"><button onClick={() => setDeletingId(null)} className="neu-button">Batal</button><button onClick={handleConfirmDelete} className="neu-button text-red-600">Ya, Hapus</button></div></div></Modal>}
            {showUploadModal && <Modal show={true} onClose={() => setShowUploadModal(false)} title="Upload Nomor Massal">
                 <div>
                    <p className="mb-4">Pastikan file Excel Anda memiliki kolom: <b>nomor</b>, <b>harga</b>, <b>sn</b> (opsional), dan <b>lokasi</b> (opsional).</p>
                     <a href="/template_nomor_spesial.xlsx" download className="neu-button !w-auto px-4 flex items-center gap-2 mb-6">
                        <Icon path={ICONS.download} className="w-5 h-5"/> Download Template
                    </a>
                    <input type="file" accept=".xlsx, .xls" onChange={e => setUploadFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
                    <div className="flex justify-center gap-4 mt-6">
                        <button onClick={() => setShowUploadModal(false)} className="neu-button">Batal</button>
                        <button onClick={handleFileUpload} disabled={!uploadFile} className="neu-button text-red-600">Upload</button>
                    </div>
                 </div>
            </Modal>}

            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-700">Manajemen Nomor Spesial</h1>
                <div className="flex gap-2">
                    <button onClick={() => setShowUploadModal(true)} className="neu-button !w-auto px-4 flex items-center gap-2"><Icon path={ICONS.upload} className="w-5 h-5" /> Upload Massal</button>
                    <button onClick={() => { setEditingNumber(undefined); setShowFormModal(true); }} className="neu-button !w-auto px-4 flex items-center gap-2"><Icon path={ICONS.plus} className="w-5 h-5" /> Tambah</button>
                </div>
            </div>

            <div className="neu-card p-6 mb-6">
                <h2 className="font-bold text-gray-700 text-lg mb-2">Pengaturan Banner Halaman Nomor Spesial</h2>
                <p className="text-sm text-gray-600 mb-4">Upload gambar baru untuk mengganti banner yang ditampilkan di halaman Nomor Spesial. Disarankan menggunakan gambar dengan rasio 3:1 (melebar).</p>
                <label className="neu-button !w-auto px-4 flex items-center gap-2 cursor-pointer">
                    <Icon path={ICONS.upload} className="w-5 h-5" /> 
                    <span>Pilih & Upload Banner Baru</span>
                    <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleBannerFileChange}
                    />
                </label>
            </div>

            <div className="neu-card-flat overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-200/50">
                        <tr>
                            <th className="p-4 font-semibold">Nomor</th>
                            <th className="p-4 font-semibold">SN</th>
                            <th className="p-4 font-semibold">Lokasi</th>
                            <th className="p-4 font-semibold">Harga</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {numbers.map(n => (
                            <tr key={n.id} className="border-t border-slate-200/80">
                                <td className="p-4 font-bold text-gray-800">{n.phoneNumber}</td>
                                <td className="p-4 font-mono text-sm">{n.sn || '-'}</td>
                                <td className="p-4">{n.lokasi || '-'}</td>
                                <td className="p-4">Rp {n.price.toLocaleString('id-ID')}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${n.isSold ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                        {n.isSold ? 'Terjual' : 'Tersedia'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex gap-2">
                                        <button onClick={() => onStatusChange(n.id, !n.isSold)} className="neu-button-icon" title={n.isSold ? 'Tandai Tersedia' : 'Tandai Terjual'}>
                                            <Icon path={n.isSold ? ICONS.eye : ICONS.eyeOff} className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => { setEditingNumber(n); setShowFormModal(true); }} className="neu-button-icon text-blue-600"><Icon path={ICONS.edit} className="w-5 h-5" /></button>
                                        <button onClick={() => setDeletingId(n.id)} className="neu-button-icon text-red-600"><Icon path={ICONS.trash} className="w-5 h-5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ManajemenNomorSpesial;