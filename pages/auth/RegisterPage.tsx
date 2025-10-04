import React, { useState, useMemo } from 'react';
import { Page, Location, User } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';

interface RegisterPageProps {
    handleRegister: (formData: any) => Promise<boolean>;
    setCurrentPage: (page: Page) => void;
    locations: Location[];
    allUsers: User[];
}

const RegisterPage: React.FC<RegisterPageProps> = ({ handleRegister, setCurrentPage, locations, allUsers }) => {
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
    const [passwordError, setPasswordError] = useState('');
    const [generalError, setGeneralError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        const newState = { ...formData, [name]: value };
        
        if (name === 'kabupaten') {
            newState.kecamatan = '';
            newState.salesforce = '';
        }
        
        setFormData(newState);
    };

    const kabupatenOptions = useMemo(() => [...new Set(locations.map(l => l.kabupaten))].sort(), [locations]);
    
    const kecamatanOptions = useMemo(() => {
        if (!formData.kabupaten) return [];
        return locations.filter(l => l.kabupaten === formData.kabupaten).map(l => l.kecamatan).sort();
    }, [locations, formData.kabupaten]);

    const salesforceOptions = useMemo(() => {
        if (!formData.kabupaten) return [];
        const salesforceInKabupaten = allUsers
            .filter(u => u.profile.kabupaten === formData.kabupaten && u.profile.salesforce)
            .map(u => u.profile.salesforce!);
        return [...new Set(salesforceInKabupaten)].sort();
    }, [allUsers, formData.kabupaten]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setGeneralError('');
        
        if (formData.idDigipos.trim().length < 6) {
            setGeneralError('ID Digipos harus minimal 6 karakter.');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setPasswordError('Password dan konfirmasi password tidak cocok.');
            return;
        }
        if (formData.password.length < 6) {
            setPasswordError('Password minimal harus 6 karakter.');
            return;
        }

        setIsLoading(true);
        const { confirmPassword, ...apiData } = formData;
        await handleRegister(apiData);
        setIsLoading(false);
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
                            <input type="text" name="idDigipos" value={formData.idDigipos} onChange={handleChange} className="input-field pl-12" placeholder="ID Digipos (min. 6 char)" required />
                        </InputWrapper>
                        <InputWrapper icon={ICONS.store}>
                            <input type="text" name="namaOutlet" value={formData.namaOutlet} onChange={handleChange} className="input-field pl-12" placeholder="Nama Outlet" required />
                        </InputWrapper>
                        <InputWrapper icon={ICONS.idCard}>
                            <input type="text" name="noRs" value={formData.noRs} onChange={handleChange} className="input-field pl-12" placeholder="No. RS (Opsional)" />
                        </InputWrapper>
                        <InputWrapper icon={ICONS.location}>
                            <select name="kabupaten" value={formData.kabupaten} onChange={handleChange} className="input-field pl-12" required>
                                <option value="">-- Pilih Kabupaten --</option>
                                {kabupatenOptions.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                        </InputWrapper>
                        <InputWrapper icon={ICONS.location}>
                            <select name="kecamatan" value={formData.kecamatan} onChange={handleChange} className="input-field pl-12" required disabled={!formData.kabupaten}>
                                <option value="">-- Pilih Kecamatan --</option>
                                {kecamatanOptions.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                        </InputWrapper>
                        <InputWrapper icon={ICONS.users}>
                            <select name="salesforce" value={formData.salesforce} onChange={handleChange} className="input-field pl-12" required disabled={!formData.kabupaten}>
                                <option value="">-- Pilih Salesforce --</option>
                                {salesforceOptions.map(sf => <option key={sf} value={sf}>{sf}</option>)}
                            </select>
                        </InputWrapper>
                        <InputWrapper icon={ICONS.user}><input type="text" name="namaOwner" value={formData.namaOwner} onChange={handleChange} className="input-field pl-12" placeholder="Nama Owner"/></InputWrapper>
                        <InputWrapper icon={ICONS.phone}><input type="tel" name="noWhatsapp" value={formData.noWhatsapp} onChange={handleChange} className="input-field pl-12" required placeholder="Nomor WhatsApp"/></InputWrapper>
                        <InputWrapper icon={ICONS.lock}><input type="password" name="password" value={formData.password} onChange={handleChange} className="input-field pl-12" placeholder="Buat Password"/></InputWrapper>
                        <InputWrapper icon={ICONS.lock}><input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="input-field pl-12" placeholder="Konfirmasi Password"/></InputWrapper>
                    </div>
                     {(passwordError || generalError) && <p className="text-sm text-red-600 mt-2 text-center">{passwordError || generalError}</p>}
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
