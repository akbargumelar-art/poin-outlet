import React, { useState, useEffect, useMemo, useRef } from 'react';
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
    const [passwordError, setPasswordError] = useState('');
    
    // State for Digipos validation
    const [isCheckingDigipos, setIsCheckingDigipos] = useState(false);
    const [digiposError, setDigiposError] = useState('');
    const [isDigiposVerified, setIsDigiposVerified] = useState(false);
    // FIX: The return type of `setTimeout` in the browser is `number`, not `NodeJS.Timeout`.
    const debounceTimeout = useRef<number | null>(null);


    // Handler umum untuk semua input.
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'idDigipos') {
            setIsDigiposVerified(false);
            setDigiposError('');
            
            // Clear auto-filled fields if user edits ID
            if (isDigiposVerified) {
                setFormData(prev => ({
                    ...prev,
                    namaOutlet: '',
                    noRs: '',
                    salesforce: ''
                }));
            }
        }
    };
    
    // This useEffect handles the debounced validation for idDigipos
    useEffect(() => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        const id = formData.idDigipos.trim();

        if (id.length === 0) {
            setIsCheckingDigipos(false);
            setDigiposError('');
            return;
        }
        
        // Start checking immediately for user feedback
        setIsCheckingDigipos(true);
        setDigiposError('');

        debounceTimeout.current = setTimeout(async () => {
            try {
                const response = await fetch(`/api/digipos-info/${id}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Error validasi');
                }
                
                // Success
                setFormData(prev => ({
                    ...prev,
                    namaOutlet: data.namaOutlet,
                    noRs: data.noRs,
                    salesforce: data.salesforce
                }));
                setIsDigiposVerified(true);
                setDigiposError('');

            } catch (error: any) {
                setIsDigiposVerified(false);
                setDigiposError(error.message);
                // Clear fields on error
                 setFormData(prev => ({
                    ...prev,
                    namaOutlet: '',
                    noRs: '',
                    salesforce: ''
                }));
            } finally {
                setIsCheckingDigipos(false);
            }
        }, 800); // 800ms delay after user stops typing

        // Cleanup on unmount
        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };

    }, [formData.idDigipos]);


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
             alert('Harap masukkan ID Digipos yang valid dan tunggu verifikasi selesai.');
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
        await handleRegister(formData);
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
                        <div className="relative md:col-span-2">
                             <InputWrapper icon={ICONS.idCard}>
                                <input 
                                    type="text" 
                                    name="idDigipos"
                                    value={formData.idDigipos}
                                    onChange={handleChange}
                                    className="input-field pl-12" 
                                    placeholder="Ketik ID Digipos Anda" 
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

                        <InputWrapper icon={ICONS.store}><input type="text" name="namaOutlet" value={formData.namaOutlet} readOnly className="input-field-disabled pl-12" placeholder="Nama Outlet" required /></InputWrapper>
                        <InputWrapper icon={ICONS.idCard}><input type="text" name="noRs" value={formData.noRs} readOnly className="input-field-disabled pl-12" placeholder="No. RS" /></InputWrapper>
                        <InputWrapper icon={ICONS.users}><input type="text" name="salesforce" value={formData.salesforce} readOnly className="input-field-disabled pl-12" placeholder="Nama Salesforce" /></InputWrapper>
                        
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