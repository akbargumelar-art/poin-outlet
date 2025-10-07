import React, { useState, useEffect, useMemo } from 'react';
import { SpecialNumber, WhatsAppSettings, User } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import Modal from '../../components/common/Modal';

type SortableKeys = keyof SpecialNumber | 'status';

// --- Form Component ---
interface NumberFormProps {
    number?: SpecialNumber;
    onSave: (number: Omit<SpecialNumber, 'id' | 'isSold'> & { id?: number }) => void;
    onCancel: () => void;
    isOperator?: boolean;
}
const NumberForm: React.FC<NumberFormProps> = ({ number, onSave, onCancel, isOperator }) => {
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
            <input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="Nomor Telepon" className={isOperator ? "input-field-disabled" : "input-field"} required readOnly={isOperator} />
            <input name="sn" value={formData.sn} onChange={handleChange} placeholder="SN (Serial Number)" className="input-field" />
            <input name="lokasi" value={formData.lokasi} onChange={handleChange} placeholder="Lokasi (e.g., Cirebon)" className="input-field" />
            <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="Harga" className={isOperator ? "input-field-disabled" : "input-field"} required readOnly={isOperator} />
            <div className="flex gap-4 pt-4">
                <button type="button" onClick={onCancel} className="neu-button">Batal</button>
                <button type="submit" className="neu-button text-red-600">Simpan</button>
            </div>
        </form>
    );
};

// --- Main Component ---
interface ManajemenNomorProps {
    currentUser: User;
    numbers: SpecialNumber[];
    onSave: (number: Omit<SpecialNumber, 'id' | 'isSold'> & { id?: number }) => void;
    onDelete: (id: number) => void;
    onStatusChange: (id: number, isSold: boolean) => void;
    onBulkUpload: (file: File) => void;
    adminUploadSpecialNumberBanner: (file: File) => void;
    settings: WhatsAppSettings | null;
    onSaveSettings: (settings: WhatsAppSettings) => void;
}

const ManajemenNomorSpesial: React.FC<ManajemenNomorProps> = ({ currentUser, numbers, onSave, onDelete, onStatusChange, onBulkUpload, adminUploadSpecialNumberBanner, settings, onSaveSettings }) => {
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingNumber, setEditingNumber] = useState<SpecialNumber | undefined>(undefined);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [recipientNumber, setRecipientNumber] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' } | null>({ key: 'isSold', direction: 'asc' });
    const [confirmingStatus, setConfirmingStatus] = useState<SpecialNumber | null>(null);


    const isOperator = currentUser.role === 'operator';
    
    const allLocations = useMemo(() => {
        return [...new Set(numbers.map(n => n.lokasi).filter(Boolean))].sort() as string[];
    }, [numbers]);


    useEffect(() => {
        setRecipientNumber(settings?.specialNumberRecipient || '');
    }, [settings]);

    const handleSaveRecipient = () => {
        const newSettings = { ...settings, specialNumberRecipient: recipientNumber };
        onSaveSettings(newSettings as WhatsAppSettings);
    };

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

    const handleConfirmStatusChange = () => {
        if (confirmingStatus) {
            onStatusChange(confirmingStatus.id, !confirmingStatus.isSold);
            setConfirmingStatus(null);
        }
    };

    const filteredAndSortedNumbers = useMemo(() => {
        let filteredItems = [...numbers];
        
        if (locationFilter) {
            filteredItems = filteredItems.filter(n => n.lokasi === locationFilter);
        }

        if (searchTerm) {
            const lowercasedSearch = searchTerm.toLowerCase();
            filteredItems = filteredItems.filter(n => 
                n.phoneNumber.toLowerCase().includes(lowercasedSearch) ||
                (n.sn && n.sn.toLowerCase().includes(lowercasedSearch)) ||
                (n.lokasi && n.lokasi.toLowerCase().includes(lowercasedSearch))
            );
        }

        if (sortConfig !== null) {
            filteredItems.sort((a, b) => {
                const aValue = a[sortConfig.key as keyof SpecialNumber];
                const bValue = b[sortConfig.key as keyof SpecialNumber];
                
                if (aValue === undefined || aValue === null) return 1;
                if (bValue === undefined || bValue === null) return -1;
                
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filteredItems;
    }, [numbers, searchTerm, sortConfig, locationFilter]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortableKeys) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <Icon path="M12 5.83l2.59 2.59L16 7l-4-4-4 4 1.41 1.41L10 5.83v12.34h2V5.83z" className="w-4 h-4 text-gray-400" />;
        }
        if (sortConfig.direction === 'asc') {
            return <Icon path="M12 4l-1.41 1.41L12 2.83l1.41 1.41L12 4zm0 16l-1.41-1.41L12 21.17l1.41-1.41L12 20z" className="w-4 h-4" />;
        }
        return <Icon path="M12 20l1.41-1.41L12 21.17l-1.41-1.41L12 20zM12 4l1.41 1.41L12 2.83 10.59 4.24 12 4z" className="w-4 h-4" />;
    };

    const handleExport = () => {
        if (filteredAndSortedNumbers.length === 0) {
            alert("Tidak ada data untuk diekspor.");
            return;
        }

        const csvHeader = ['Nomor Telepon', 'SN', 'Lokasi', 'Harga', 'Status'].join(',');
        const csvRows = filteredAndSortedNumbers.map(n => 
            [
                n.phoneNumber,
                n.sn || '',
                n.lokasi || '',
                n.price,
                n.isSold ? 'Terjual' : 'Tersedia'
            ].join(',')
        );

        const csv = [csvHeader, ...csvRows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'data_nomor_spesial.csv';
        link.click();
    };


    return (
        <div className="flex flex-col h-full">
            {showFormModal && <Modal show={true} onClose={() => setShowFormModal(false)} title={editingNumber ? 'Edit Nomor' : 'Tambah Nomor Baru'}><NumberForm number={editingNumber} onSave={handleSave} onCancel={() => setShowFormModal(false)} isOperator={isOperator} /></Modal>}
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
             {confirmingStatus && (
                <Modal show={true} onClose={() => setConfirmingStatus(null)} title="Konfirmasi Perubahan Status">
                    <div className="text-center">
                        <p className="mb-6">
                            Anda yakin ingin mengubah status nomor <strong>{confirmingStatus.phoneNumber}</strong> menjadi <strong>{confirmingStatus.isSold ? 'Tersedia' : 'Terjual'}</strong>?
                        </p>
                        <div className="flex gap-4 justify-center">
                            <button onClick={() => setConfirmingStatus(null)} className="neu-button">Batal</button>
                            <button onClick={handleConfirmStatusChange} className="neu-button text-red-600">Ya, Ubah Status</button>
                        </div>
                    </div>
                </Modal>
            )}

            <div className="flex-shrink-0">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-700">{isOperator ? 'Status Nomor Spesial' : 'Manajemen Nomor Spesial'}</h1>
                    <div className="flex gap-2">
                        <button onClick={handleExport} className="neu-button !w-auto px-4 flex items-center gap-2">
                            <Icon path={ICONS.download} className="w-5 h-5" /> Download Data
                        </button>
                        {!isOperator && (
                            <>
                                <button onClick={() => setShowUploadModal(true)} className="neu-button !w-auto px-4 flex items-center gap-2"><Icon path={ICONS.upload} className="w-5 h-5" /> Upload Massal</button>
                                <button onClick={() => { setEditingNumber(undefined); setShowFormModal(true); }} className="neu-button !w-auto px-4 flex items-center gap-2"><Icon path={ICONS.plus} className="w-5 h-5" /> Tambah</button>
                            </>
                        )}
                    </div>
                </div>

                {!isOperator && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="neu-card p-6">
                            <h2 className="font-bold text-gray-700 text-lg mb-2">Pengaturan Banner</h2>
                            <p className="text-sm text-gray-600 mb-4">Upload gambar (3:1) untuk banner di halaman Nomor Spesial.</p>
                            <label className="neu-button !w-auto px-4 flex items-center gap-2 cursor-pointer">
                                <Icon path={ICONS.upload} className="w-5 h-5" /> 
                                <span>Ganti Banner</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleBannerFileChange} />
                            </label>
                        </div>
                         <div className="neu-card p-6">
                            <h2 className="font-bold text-gray-700 text-lg mb-2">Pengaturan Penerima WhatsApp</h2>
                            <p className="text-sm text-gray-600 mb-4">Masukkan nomor tujuan untuk pesanan (awali dengan 62).</p>
                            <div className="flex gap-2">
                                 <input 
                                    type="text"
                                    value={recipientNumber}
                                    onChange={(e) => setRecipientNumber(e.target.value)}
                                    placeholder="e.g., 628123456789"
                                    className="input-field"
                                />
                                <button onClick={handleSaveRecipient} className="neu-button !w-auto px-4">Simpan</button>
                            </div>
                        </div>
                    </div>
                )}
                 <div className="neu-card-flat p-4 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                        type="text"
                        placeholder="Cari berdasarkan nomor, SN..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field w-full"
                    />
                     <select
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="input-field w-full"
                    >
                        <option value="">Semua Lokasi</option>
                        {allLocations.map(loc => (
                            <option key={loc} value={loc}>{loc}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-auto neu-card-flat min-h-0">
                <table className="w-full min-w-max text-left">
                    <thead className="bg-slate-200/80 backdrop-blur-sm sticky top-0 z-10">
                        <tr>
                            <th className="p-4"><button onClick={() => requestSort('phoneNumber')} className="font-semibold flex items-center gap-1">Nomor {getSortIcon('phoneNumber')}</button></th>
                            <th className="p-4"><button onClick={() => requestSort('sn')} className="font-semibold flex items-center gap-1">SN {getSortIcon('sn')}</button></th>
                            <th className="p-4"><button onClick={() => requestSort('lokasi')} className="font-semibold flex items-center gap-1">Lokasi {getSortIcon('lokasi')}</button></th>
                            <th className="p-4"><button onClick={() => requestSort('price')} className="font-semibold flex items-center gap-1">Harga {getSortIcon('price')}</button></th>
                            <th className="p-4"><button onClick={() => requestSort('isSold')} className="font-semibold flex items-center gap-1">Status {getSortIcon('isSold')}</button></th>
                            <th className="p-4 font-semibold">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSortedNumbers.map(n => (
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
                                        <button onClick={() => setConfirmingStatus(n)} className="neu-button-icon" title={n.isSold ? 'Tandai Tersedia' : 'Tandai Terjual'}>
                                            <Icon path={n.isSold ? ICONS.eye : ICONS.eyeOff} className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => { setEditingNumber(n); setShowFormModal(true); }} className="neu-button-icon text-blue-600"><Icon path={ICONS.edit} className="w-5 h-5" /></button>
                                        {!isOperator && (
                                            <button onClick={() => setDeletingId(n.id)} className="neu-button-icon text-red-600"><Icon path={ICONS.trash} className="w-5 h-5" /></button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredAndSortedNumbers.length === 0 && <p className="p-8 text-center text-gray-500">Tidak ada nomor untuk ditampilkan.</p>}
            </div>
        </div>
    );
};

export default ManajemenNomorSpesial;