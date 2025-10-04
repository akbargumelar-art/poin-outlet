import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Page, Location } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';

interface RegisterPageProps {
    handleRegister: (formData: any) => Promise<boolean>;
    setCurrentPage: (page: Page) => void;
    locations: Location[];
}

const InputWrapper: React.FC<{icon: string, children: React.ReactNode}> = ({icon, children}) => (
    <div className="relative w-full">
        <Icon path={icon} className="absolute top-1/2 left-4 -translate-y-1/2 w-5 h-5 text-gray-400 z-10"/>
        {children}
    </div>
);

const RegisterPage: React.FC<RegisterPageProps> = ({ handleRegister, setCurrentPage, locations }) => {
    const [formData, setFormData] = useState({
        idDigipos: '',
        namaOutlet: '',
        noRs: '',
        kabupaten: '',
        kecamatan: '',
        namaOwner: '',
        noWhatsapp: '',
        salesforce: '',
        password: '',
        confirmPassword: ''
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // --- PERUBAHAN DIMULAI DI SINI ---
    const [digiposValidation, setDigiposValidation] = useState({
        status: 'idle', // 'idle', 'loading', 'valid', 'invalid'
        message: ''
    });
    const isDigiposValidated = digiposValidation.status === 'valid';

    const handleValidateDigipos = useCallback(async () => {
        if (!formData.idDigipos) {
            setDigiposValidation({ status: 'idle', message: '' });
            return;
        }

        setDigiposValidation({ status: 'loading', message: 'Memvalidasi...' });
        try {
            // Ganti URL ini jika endpoint Anda berbeda
            const response = await fetch(`/api/validate-digipos/${formData.idDigipos}`);
            const data = await response.json();

            if (!response.ok) {
                // Handle error dari API (404, 409, dll)
                setDigiposValidation({ status: 'invalid', message: data.message });
                // Kosongkan field jika validasi gagal
                setFormData(prev => ({ ...prev, namaOutlet: '', noRs: '', salesforce: '' }));
            } else {
                // Handle sukses dari API
                setDigiposValidation({ status: 'valid', message: 'ID Ditemukan & Valid' });
                // Isi otomatis form
                setFormData(prev => ({
                    ...prev,
                    namaOutlet: data.namaOutlet,
                    noRs: data.noRs,
                    salesforce: data.salesforce
                }));
            }
        } catch (err) {
            setDigiposValidation({ status: 'invalid', message: 'Gagal terhubung ke server.' });
        }
    }, [formData.idDigipos]);
    // --- PERUBAHAN SELESAI DI SINI ---
    
    // ... (sisa kode useMemo, useEffect, handleChange tidak berubah) ...
    const uniqueKabupatens = useMemo(() => {
        return [...new Set(locations.map(l => l.kabupaten))].sort();
    }, [locations]);

    const availableKecamatans = useMemo(() => {
        if (!formData.kabupaten) return [];
        return locations
            .filter(l => l.kabupaten === formData.kabupaten)
            .map(l => l.kecamatan)
            .sort();
    }, [locations, formData.kabupaten]);

    useEffect(() => {
        const isKecamatanValid = availableKecamatans.includes(formData.kecamatan);
        if (!isKecamatanValid) {
            setFormData(prev => ({ ...prev, kecamatan: '' }));
        }
    }, [formData.kabupaten, availableKecamatans, formData.kecamatan]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Jika ID Digipos diubah, reset status validasi
        if (name === 'idDigipos') {
            setDigiposValidation({ status: 'idle', message: '' });
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        // ... (fungsi handleSubmit tidak berubah) ...
    };
    
    return (
        <div className="min-h-screen neu-bg flex justify-center items-center p-4">
            <div className="w-full max-w-2xl neu-card p-6 z-10 animate-fade-in-down relative">
                {/* ... (bagian header & tombol kembali tidak berubah) ... */}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* --- PERUBAHAN PADA INPUT ID DIGIPOS --- */}
                        <div>
                            <InputWrapper icon={ICONS.idCard}>
                                <input 
                                    type="text" 
                                    name="idDigipos" 
                                    value={formData.idDigipos} 
                                    onChange={handleChange}
                                    onBlur={handleValidateDigipos} // Panggil validasi saat fokus keluar
                                    className="input-field pl-12" 
                                    placeholder="ID Digipos" 
                                    required 
                                    disabled={isDigiposValidated} // Nonaktifkan setelah valid
                                />
                            </InputWrapper>
                            {/* Tampilkan pesan status validasi */}
                            {digiposValidation.status !== 'idle' && (
                                <p className={`text-xs mt-1 pl-1 ${
                                    digiposValidation.status === 'valid' ? 'text-green-600' :
                                    digiposValidation.status === 'invalid' ? 'text-red-600' : 'text-gray-500'
                                }`}>
                                    {digiposValidation.message}
                                </p>
                            )}
                        </div>
                        
                        {/* --- PERUBAHAN PADA INPUT OTOMATIS --- */}
                        <InputWrapper icon={ICONS.store}>
                            <input type="text" name="namaOutlet" value={formData.namaOutlet} onChange={handleChange} className="input-field pl-12" placeholder="Nama Outlet" required readOnly={isDigiposValidated} />
                        </InputWrapper>
                        <InputWrapper icon={ICONS.idCard}>
                            <input type="text" name="noRs" value={formData.noRs} onChange={handleChange} className="input-field pl-12" placeholder="No. RS" required readOnly={isDigiposValidated} />
                        </InputWrapper>
                        <InputWrapper icon={ICONS.users}>
                           <input type="text" name="salesforce" value={formData.salesforce} onChange={handleChange} className="input-field pl-12" placeholder="Nama Salesforce" required readOnly={isDigiposValidated} />
                        </InputWrapper>

                        {/* ... (sisa input lainnya tidak berubah, tapi Anda bisa membuatnya disabled sampai ID valid) ... */}
                        
                        <InputWrapper icon={ICONS.location}>
                           <select name="kabupaten" value={formData.kabupaten} onChange={handleChange} className="input-field pl-12" required>
                                <option value="">-- Pilih Kabupaten --</option>
                                {uniqueKabupatens.map(k => <option key={k} value={k}>{k}</option>)}
                           </select>
                        </InputWrapper>
                        <InputWrapper icon={ICONS.location}>
                           <select name="kecamatan" value={formData.kecamatan} onChange={handleChange} className="input-field pl-12" required disabled={!formData.kabupaten}>
                                <option value="">-- Pilih Kecamatan --</option>
                                {availableKecamatans.map(k => <option key={k} value={k}>{k}</option>)}
                           </select>
                        </InputWrapper>
                        <InputWrapper icon={ICONS.user}><input type="text" name="namaOwner" value={formData.namaOwner} onChange={handleChange} className="input-field pl-12" placeholder="Nama Owner" required /></InputWrapper>
                        <InputWrapper icon={ICONS.phone}><input type="tel" name="noWhatsapp" value={formData.noWhatsapp} onChange={handleChange} className="input-field pl-12" required placeholder="Nomor WhatsApp"/></InputWrapper>
                        <InputWrapper icon={ICONS.lock}><input type="password" name="password" value={formData.password} onChange={handleChange} className="input-field pl-12" placeholder="Buat Password" required /></InputWrapper>
                        <InputWrapper icon={ICONS.lock}><input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="input-field pl-12" placeholder="Konfirmasi Password" required /></InputWrapper>
                    </div>
                     {error && <p className="text-sm text-red-600 mt-2 text-center">{error}</p>}
                    <button type="submit" className="neu-button text-red-600" disabled={isLoading || !isDigiposValidated}>
                        {isLoading ? 'Mendaftar...' : 'Registrasi'}
                    </button>
                </form>
                {/* ... (bagian footer tidak berubah) ... */}
            </div>
        </div>
    );
};

export default RegisterPage;