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
        recipientId: ''
    });

    useEffect(() => {
        if (settings) {
            setFormData(settings);
        }
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
            // Reset recipientId if type changes
            recipientId: name === 'recipientType' ? '' : prev.recipientId
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };
    
    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-700 mb-6">Pengaturan Notifikasi WhatsApp</h1>
            <div className="neu-card p-8 max-w-2xl mx-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-gray-600 text-sm font-semibold mb-2 flex items-center gap-2">
                            <Icon path={ICONS.link} className="w-5 h-5" /> Webhook URL
                        </label>
                        <input 
                            type="url"
                            name="webhookUrl"
                            value={formData.webhookUrl}
                            onChange={handleChange}
                            placeholder="https://your-whatsapp-gateway.com/api/send"
                            className="input-field"
                            required
                            disabled={isReadOnly}
                        />
                         <p className="text-xs text-gray-500 mt-1">URL API dari layanan WhatsApp Gateway Anda untuk mengirim pesan.</p>
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
                        <p className="text-xs text-gray-500 mt-1">Nomor WhatsApp yang terdaftar di layanan gateway sebagai pengirim.</p>
                    </div>

                    <div className="pt-4 border-t">
                        <label className="block text-gray-600 text-sm font-semibold mb-2">Tujuan Penerima Notifikasi</label>
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
                    </div>
                    
                    <div>
                        <label className="block text-gray-600 text-sm font-semibold mb-2">
                           {formData.recipientType === 'personal' ? 'Nomor WhatsApp Penerima' : 'ID Grup Penerima'}
                        </label>
                        <input 
                            type="text"
                            name="recipientId"
                            value={formData.recipientId}
                            onChange={handleChange}
                            placeholder={formData.recipientType === 'personal' ? 'Contoh: 6289876543210' : 'Contoh: 12036304@g.us'}
                            className="input-field"
                            required
                            disabled={isReadOnly}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {formData.recipientType === 'personal' 
                                ? 'Nomor yang akan menerima notifikasi penukaran poin.' 
                                : 'ID Grup WhatsApp yang akan menerima notifikasi. Dapatkan dari detail info grup.'
                            }
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
