import React, { useState, useEffect, useMemo } from 'react';
import { Page, Location } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';

interface RegisterPageProps {
    handleRegister: (formData: any) => Promise<boolean>;
    setCurrentPage: (page: Page) => void;
    locations: Location[];
}

const RegisterPage: React.FC<RegisterPageProps> = ({ handleRegister, setCurrentPage, locations }) => {
    // Consolidated state object for the entire form
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

    const [isCheckingDigipos, setIsCheckingDigipos] = useState(false);
    const [digiposError, setDigiposError] = useState('');
    const [isDigiposVerified, setIsDigiposVerified] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    // Consolidated change handler for all form inputs
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        // Special handling for the ID Digipos input
        if (name === 'idDigipos') {
            // As the user types a new ID, reset verification and clear dependent fields
            if (isDigiposVerified) {
                setIsDigiposVerified(false);
            }
            setDigiposError('');
            setFormData(prev => ({
                ...prev,
                idDigipos: value, // Update the ID being typed
                namaOutlet: '',   // Clear auto-filled data
                noRs: '',
                salesforce: ''
            }));
        } else {
            // Standard handling for all other inputs
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    // Validation triggers on losing focus from the ID field
    const handleDigiposBlur = async () => {
        const trimmedId = formData.idDigipos.trim();

        // Don't re-validate if it's already verified or input is too short
        if (isDigiposVerified || trimmedId.length < 6) {
            if (trimmedId.length > 0 && trimmedId.length < 6) {
                setDigiposError('ID Digipos harus minimal 6 karakter.');
            } else {
                setDigiposError('');
            }
            return;
        }

        setIsCheckingDigipos(true);
        setDigiposError('');

        try {
            const response = await fetch(`/api/digipos-info/${trimmedId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error validasi ID Digipos');
            }
            
            // On success, populate the related fields
            setFormData(prev => ({
                ...prev,
                namaOutlet: data.namaOutlet,
                noRs: data.noRs,
                salesforce: data.salesforce
            }));
            setIsDigiposVerified(true);

        } catch (error: any) {
            setIsDigiposVerified(false);
            setDigiposError(error.message);
            // Ensure related fields are cleared on error
            setFormData(prev => ({
                ...prev,
                namaOutlet: '',
                noRs: '',
                salesforce: ''
            }));
        } finally {
            setIsCheckingDigipos(false);
        }
    };

    const kabupatenOptions = useMemo(() => [...new Set(locations.map(l => l.kabupaten))].sort(), [locations]);
    const kecamatanOptions = useMemo(() => {
        if (!formData.kabupaten) return [];
        return locations.filter(l => l.kabupaten === formData.kabupaten).map(l => l.kecamatan).sort();
    }, [locations, formData.kabupaten]);

     useEffect(() => {
        if (formData.kabupaten && kecamatanOptions.length > 0) {
            const isCurrentKecamatanValid = kecamatanOptions.includes(formData.kecamatan);
            if (!isCurrentKecamatanValid) {
                 setFormData(prev => ({...prev, kecamatan: kecamatanOptions[0]}));
            }
        } else if (formData.kabupaten === '') {
            setFormData(prev => ({...prev, kecamatan: ''}));
        }
    }, [formData.kabupaten, kecamatanOptions]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        if (!isDigiposVerified) {
             alert('Harap selesaikan verifikasi ID Digipos terlebih dahulu.');
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
        // Create a clean object for the API, excluding `confirmPassword`
        const apiData = {
            idDigipos: formData.idDigipos,
            namaOutlet: formData.namaOutlet,
            noRs: formData.noRs,
            kabupaten: formData.kabupaten,
            kecamatan: formData.kecamatan,
            namaOwner: formData.namaOwner,
            noWhatsapp: formData.noWhatsapp,
            salesforce: formData.salesforce,
            password: formData.password,
        };
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
                        {/* ID Digipos Input and its status message are grouped into one grid cell */}
                        <div>
                            <InputWrapper icon={ICONS.idCard}>
                                <input 
                                    type="text" 
                                    name="idDigipos"
                                    value={formData.idDigipos}
                                    onChange={handleChange}
                                    onBlur={handleDigiposBlur}
                                    className="input-field pl-12" 
                                    placeholder="Ketik ID Digipos (min. 6 char)" 
                                    required 
                                    autoComplete="off"
                                />
                            </InputWrapper>
                            <div className="text-xs mt-1 h-4 px-1">
                                {isCheckingDigipos && <p className="text-gray-500 animate-pulse">Memeriksa ID...</p>}
                                {digiposError && <p className="text-red-600">{digiposError}</p>}
                                {isDigiposVerified && <p className="text-green-600 font-semibold">✓ ID Digipos valid dan tersedia!</p>}
                            </div>
                        </div>

                        {/* This field is now auto-filled */}
                        <InputWrapper icon={ICONS.store}><input type="text" name="namaOutlet" value={formData.namaOutlet} readOnly className="input-field-disabled pl-12" placeholder="Nama Outlet" required /></InputWrapper>
                        
                        {/* These fields are also auto-filled */}
                        <InputWrapper icon={ICONS.idCard}><input type="text" name="noRs" value={formData.noRs} readOnly className="input-field-disabled pl-12" placeholder="No. RS" /></InputWrapper>
                        <InputWrapper icon={ICONS.users}><input type="text" name="salesforce" value={formData.salesforce} readOnly className="input-field-disabled pl-12" placeholder="Nama Salesforce" /></InputWrapper>
                        
                        {/* User-filled fields continue in the grid */}
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

                        <InputWrapper icon={ICONS.user}><input type="text" name="namaOwner" value={formData.namaOwner} onChange={handleChange} className="input-field pl-12" placeholder="Nama Owner"/></InputWrapper>
                        <InputWrapper icon={ICONS.phone}><input type="tel" name="noWhatsapp" value={formData.noWhatsapp} onChange={handleChange} className="input-field pl-12" required placeholder="Nomor WhatsApp"/></InputWrapper>

                        <InputWrapper icon={ICONS.lock}><input type="password" name="password" value={formData.password} onChange={handleChange} className="input-field pl-12" placeholder="Buat Password"/></InputWrapper>
                        <InputWrapper icon={ICONS.lock}><input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="input-field pl-12" placeholder="Konfirmasi Password"/></InputWrapper>
                    </div>
                     {passwordError && <p className="text-sm text-red-600 mt-2 text-center">{passwordError}</p>}
                    <button type="submit" className="neu-button text-red-600" disabled={isLoading || !isDigiposVerified}>
                        {isLoading ? 'Mendaftar...' : 'Registrasi'}
                    </button>
                </form>
                <p className="text-center text-sm mt-6">Sudah punya akun? <button onClick={() => setCurrentPage('login')} className="font-bold text-red-600">Login</button></p>
            </div>
        </div>
    );
};

export default RegisterPage;