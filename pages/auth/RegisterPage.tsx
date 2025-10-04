import React, { useState, useMemo, useEffect } from 'react';
import { Page, Location } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';

interface RegisterPageProps {
    handleRegister: (formData: any) => Promise<boolean>;
    setCurrentPage: (page: Page) => void;
    locations: Location[];
}

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
        // Reset kecamatan if kabupaten changes
        setFormData(prev => ({ ...prev, kecamatan: '' }));
    }, [formData.kabupaten]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (formData.password !== formData.confirmPassword) {
            setError('Password dan konfirmasi password tidak cocok.');
            return;
        }
        if (formData.password.length < 6) {
            setError('Password minimal harus 6 karakter.');
            return;
        }

        setIsLoading(true);
        const { confirmPassword, ...apiData } = formData;
        const success = await handleRegister(apiData);
        if (!success) {
            // Error is handled by the modal in App.tsx, but we stop loading
            setIsLoading(false);
        }
    };
    
    const InputWrapper: React.FC<{icon: string, children: React.ReactNode}> = ({icon, children}) => (
        <div className="relative w-full">
            <Icon path={icon} className="absolute top-1/2 left-4 -translate-y-1/2 w-5 h-5 text-gray-400 z-10"/>
            {children}
        </div>
    );
    
    return (
         <div className="min-h-screen neu-bg flex justify-center items-center p-4">
            <div className="w-full max-w-2xl neu-card p-6 z-10 animate-fade-in-down relative">
                 <button onClick={() => setCurrentPage('landing')} className="absolute top-4 left-4 neu-button-icon text-gray-500 hover:text-red-600 !text-red-600" aria-label="Kembali ke beranda">
                    <Icon path={ICONS.chevronLeft} className="w-6 h-6" />
                </button>
                 <div className="text-center mb-6">
                    <img src="/logo.png" alt="Logo Agrabudi Komunika" className="h-9 sm:h-10 mx-auto mb-4" />
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-700">Registrasi Mitra Baru</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputWrapper icon={ICONS.idCard}>
                            <input type="text" name="idDigipos" value={formData.idDigipos} onChange={handleChange} className="input-field pl-12" placeholder="ID Digipos" required />
                        </InputWrapper>
                        <InputWrapper icon={ICONS.store}>
                            <input type="text" name="namaOutlet" value={formData.namaOutlet} onChange={handleChange} className="input-field pl-12" placeholder="Nama Outlet" required />
                        </InputWrapper>
                        <InputWrapper icon={ICONS.idCard}>
                            <input type="text" name="noRs" value={formData.noRs} onChange={handleChange} className="input-field pl-12" placeholder="No. RS" required />
                        </InputWrapper>
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
                        <InputWrapper icon={ICONS.users}>
                           <input type="text" name="salesforce" value={formData.salesforce} onChange={handleChange} className="input-field pl-12" placeholder="Nama Salesforce" required />
                        </InputWrapper>
                        <InputWrapper icon={ICONS.user}><input type="text" name="namaOwner" value={formData.namaOwner} onChange={handleChange} className="input-field pl-12" placeholder="Nama Owner" required /></InputWrapper>
                        <InputWrapper icon={ICONS.phone}><input type="tel" name="noWhatsapp" value={formData.noWhatsapp} onChange={handleChange} className="input-field pl-12" required placeholder="Nomor WhatsApp"/></InputWrapper>
                        <InputWrapper icon={ICONS.lock}><input type="password" name="password" value={formData.password} onChange={handleChange} className="input-field pl-12" placeholder="Buat Password" required /></InputWrapper>
                        <InputWrapper icon={ICONS.lock}><input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="input-field pl-12" placeholder="Konfirmasi Password" required /></InputWrapper>
                    </div>
                     {error && <p className="text-sm text-red-600 mt-2 text-center">{error}</p>}
                    <button type="submit" className="neu-button text-red-600" disabled={isLoading}>
                        {isLoading ? 'Mendaftar...' : 'Registrasi'}
                    </button>
                </form>
                <p className="text-center text-sm mt-6">Sudah punya akun? <button onClick={() => setCurrentPage('login')} className="font-bold text-red-600">Login</button></p>
            </div>
        </div>
    );
};

export default RegisterPage;
