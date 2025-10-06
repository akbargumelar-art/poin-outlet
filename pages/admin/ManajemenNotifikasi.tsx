import React, { useState, useEffect } from 'react';
import { WhatsAppSettings } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';

interface ManajemenNotifikasiProps {
    settings: WhatsAppSettings | null;
    onSave: (settings: WhatsAppSettings) => void;
    isReadOnly?: boolean;
}

const ManajemenNotifikasi: React.FC<ManajemenNotifikasiProps> = ({ settings, onSave, isReadOnly }) => {
    const [formData, setFormData] = useState<WhatsAppSettings>({
        webhookUrl: '',
        senderNumber: '',
        recipientType: 'personal',
        recipientId: '',
        apiKey: '',
        specialNumberRecipient: ''
    });

    useEffect(() => {
        if (settings) {
            setFormData(settings);
        }
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'recipientType') {
            setFormData(prev => ({
                ...prev,
                recipientType: value as 'personal' | 'group',
                recipientId: '' 
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Trim trailing slash if user adds one, to ensure consistency
        const cleanedUrl = formData.webhookUrl.endsWith('/') ? formData.webhookUrl.slice(0, -1) : formData.webhookUrl;
        onSave({ ...formData, webhookUrl: cleanedUrl });
    };
    
    return (
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-700 mb-6">Pengaturan Notifikasi WhatsApp</h1>
            <div className="neu-card p-8 max-w-2xl mx-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-gray-600 text-sm font-semibold mb-2 flex items-center gap-2">
                            <Icon path={ICONS.link} className="w-5 h-5" /> Webhook URL (WAHA)
                        </label>
                        <input 
                            type="url"
                            name="webhookUrl"
                            value={formData.webhookUrl}
                            onChange={handleChange}
                            placeholder="https://waha.abkciraya.cloud"
                            className="input-field"
                            required
                            disabled={isReadOnly}
                        />
                         <p className="text-xs text-gray-500 mt-1">URL dasar dari server WAHA Anda (tanpa /api/... di belakangnya).</p>
                    </div>

                    <div>
                        <label className="block text-gray-600 text-sm font-semibold mb-2 flex items-center gap-2">
                           <Icon path={ICONS.lock} className="w-5 h-5" /> WAHA API Key
                        </label>
                        <input 
                            type="password"
                            name="apiKey"
                            value={formData.apiKey}
                            onChange={handleChange}
                            placeholder="Masukkan API Key dari WAHA"
                            className="input-field"
                            required
                            disabled={isReadOnly}
                        />
                        <p className="text-xs text-gray-500 mt-1">API Key yang Anda atur saat instalasi WAHA (Header: X-Api-Key).</p>
                    </div>

                    <div>
                        <label className="block text-gray-600 text-sm font-semibold mb-2 flex items-center gap-2">
                           <Icon path={ICONS.whatsapp} className="w-5 h-5" /> Nomor Pengirim
                        </label>
                        <input 
                            type="tel"
                            name="senderNumber"
                            value={formData.senderNumber}
                            onChange={handleChange}
                            placeholder="Contoh: 6281234567890"
                            className="input-field"
                            required
                            disabled={isReadOnly}
                        />
                        <p className="text-xs text-gray-500 mt-1">Nomor WhatsApp yang terhubung ke sesi WAHA sebagai pengirim.</p>
                    </div>

                    <div className="pt-4 border-t">
                         <h3 className="text-lg font-bold text-gray-700">Tujuan Notifikasi</h3>
                    </div>

                    <div>
                        <label className="block text-gray-600 text-sm font-semibold mb-2">Tujuan Notifikasi Penukaran Poin</label>
                        <select 
                            name="recipientType"
                            value={formData.recipientType}
                            onChange={handleChange}
                            className="input-field"
                            disabled={isReadOnly}
                        >
                            <option value="personal">Nomor Personal</option>
                            <option value="group">Grup WhatsApp</option>
                        </select>
                         <input 
                            type="text"
                            name="recipientId"
                            value={formData.recipientId}
                            onChange={handleChange}
                            placeholder={formData.recipientType === 'personal' ? 'Contoh: 6289876543210' : 'Contoh: 12036304@g.us'}
                            className="input-field mt-2"
                            required
                            disabled={isReadOnly}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-gray-600 text-sm font-semibold mb-2">
                           Nomor Penerima Pesanan Nomor Spesial
                        </label>
                        <input 
                            type="text"
                            name="specialNumberRecipient"
                            value={formData.specialNumberRecipient}
                            onChange={handleChange}
                            placeholder="Contoh: 628123456789 (tanpa + atau 0 di depan)"
                            className="input-field"
                            required
                            disabled={isReadOnly}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Nomor yang akan menerima pesanan nomor spesial dari mitra. Awali dengan kode negara (62).
                        </p>
                    </div>
                    
                    {!isReadOnly && (
                        <div className="pt-6">
                            <button type="submit" className="w-full neu-button text-red-600">
                                Simpan Pengaturan
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default ManajemenNotifikasi;