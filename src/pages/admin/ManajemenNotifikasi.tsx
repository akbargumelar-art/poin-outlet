
import React, { useState, useEffect } from 'react';
import { WhatsAppSettings } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';

interface ManajemenNotifikasiProps {
    settings: WhatsAppSettings | null;
    onSave: (settings: WhatsAppSettings) => Promise<boolean>;
    isReadOnly?: boolean;
    showToast: (message: string, type: 'success' | 'error') => void;
}

const ManajemenNotifikasi: React.FC<ManajemenNotifikasiProps> = ({ settings, onSave, isReadOnly, showToast }) => {
    const [formData, setFormData] = useState<WhatsAppSettings>({
        webhookUrl: '',
        senderNumber: '',
        recipientType: 'personal',
        recipientId: '',
        apiKey: '',
        sessionName: 'default',
        specialNumberRecipient: '',
        specialNumberStatusRecipientType: 'personal',
        specialNumberStatusRecipientId: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (settings && typeof settings === 'object') {
            // Gunakan spread untuk memastikan nilai default tetap ada jika data dari backend tidak lengkap
            setFormData(prev => ({
                ...prev,
                ...settings
            }));
        }
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        // Trim trailing slash
        const cleanedUrl = formData.webhookUrl.endsWith('/') ? formData.webhookUrl.slice(0, -1) : formData.webhookUrl;
        const success = await onSave({ ...formData, webhookUrl: cleanedUrl });
        
        if (success) {
            showToast('Pengaturan notifikasi berhasil disimpan', 'success');
        } else {
            showToast('Gagal menyimpan pengaturan. Cek koneksi.', 'error');
        }
        
        setIsSaving(false);
    };
    
    return (
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-700 mb-6">Pengaturan Notifikasi WhatsApp</h1>
            <div className="neu-card p-8 max-w-2xl mx-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
                            <Icon path={ICONS.store} className="w-5 h-5" /> Server WAHA
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-600 text-sm font-semibold mb-2">Webhook URL (WAHA)</label>
                                <input type="url" name="webhookUrl" value={formData.webhookUrl} onChange={handleChange} placeholder="https://waha.abkciraya.cloud" className="input-field" required disabled={isReadOnly} />
                            </div>
                            <div>
                                <label className="block text-gray-600 text-sm font-semibold mb-2">WAHA API Key</label>
                                <input type="password" name="apiKey" value={formData.apiKey} onChange={handleChange} placeholder="X-Api-Key" className="input-field" required disabled={isReadOnly} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-600 text-sm font-semibold mb-2">Sesi (Session)</label>
                                    <input type="text" name="sessionName" value={formData.sessionName || ''} onChange={handleChange} placeholder="default" className="input-field" required disabled={isReadOnly} />
                                </div>
                                <div>
                                    <label className="block text-gray-600 text-sm font-semibold mb-2">Nomor Pengirim</label>
                                    <input type="tel" name="senderNumber" value={formData.senderNumber} onChange={handleChange} placeholder="6281234567890" className="input-field" required disabled={isReadOnly} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                         <h3 className="text-lg font-bold text-gray-700 mb-4">Konfigurasi Tujuan Notifikasi</h3>
                    </div>

                    {/* SECTION 1: Redemption */}
                    <div className="p-4 neu-inset rounded-xl">
                        <label className="block text-gray-700 font-bold mb-2">Tujuan Notifikasi Penukaran Poin</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <select name="recipientType" value={formData.recipientType} onChange={handleChange} className="input-field sm:col-span-1" disabled={isReadOnly}>
                                <option value="personal">Personal</option>
                                <option value="group">Grup WA</option>
                            </select>
                            <input type="text" name="recipientId" value={formData.recipientId} onChange={handleChange} placeholder={formData.recipientType === 'personal' ? '628xxx' : '1203xxx@g.us'} className="input-field sm:col-span-2" required disabled={isReadOnly} />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 italic">Notifikasi dikirim saat mitra melakukan penukaran poin di katalog.</p>
                    </div>

                    {/* SECTION 2: Special Number Purchase */}
                    <div className="p-4 neu-inset rounded-xl">
                        <label className="block text-gray-700 font-bold mb-2">Tujuan Pesanan Nomor Spesial (Mitra)</label>
                        <input type="text" name="specialNumberRecipient" value={formData.specialNumberRecipient} onChange={handleChange} placeholder="628xxx" className="input-field" required disabled={isReadOnly} />
                        <p className="text-[10px] text-gray-400 mt-2 italic">Nomor ini akan dihubungi oleh Mitra via WA saat mereka mengklik tombol "Beli via WhatsApp".</p>
                    </div>

                    {/* SECTION 3: Special Number Status Auto Notification */}
                    <div className="p-4 neu-inset rounded-xl border border-yellow-200 bg-yellow-50/30">
                        <label className="block text-yellow-800 font-bold mb-2 flex items-center gap-2">
                             <Icon path={ICONS.simCard} className="w-4 h-4" /> 
                             Notifikasi Otomatis Status Terjual
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <select name="specialNumberStatusRecipientType" value={formData.specialNumberStatusRecipientType} onChange={handleChange} className="input-field sm:col-span-1" disabled={isReadOnly}>
                                <option value="personal">Personal</option>
                                <option value="group">Grup WA</option>
                            </select>
                            <input type="text" name="specialNumberStatusRecipientId" value={formData.specialNumberStatusRecipientId} onChange={handleChange} placeholder={formData.specialNumberStatusRecipientType === 'personal' ? '628xxx' : '1203xxx@g.us'} className="input-field sm:col-span-2" required disabled={isReadOnly} />
                        </div>
                        <p className="text-[10px] text-yellow-600 mt-2 italic font-medium">Notifikasi dikirim otomatis oleh sistem ke Group/Personal terpilih saat admin merubah status nomor menjadi "Terjual".</p>
                    </div>
                    
                    {!isReadOnly && (
                        <div className="pt-6">
                            <button type="submit" className="w-full neu-button text-red-600" disabled={isSaving}>
                                {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default ManajemenNotifikasi;
