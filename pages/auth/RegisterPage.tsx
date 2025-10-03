
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
    // State for the main form data. `idDigipos` will only be set after successful validation.
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

    // --- Isolated state for the ID Digipos input field to prevent re-renders ---
    const [digiposInput, setDigiposInput] = useState('');
    const [isCheckingDigipos, setIsCheckingDigipos] = useState(false);
    const [digiposError, setDigiposError] = useState('');
    const [isDigiposVerified, setIsDigiposVerified] = useState(false);
    const debounceTimeout = useRef<number | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    // Handler for all inputs EXCEPT the idDigipos field.
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    // Special handler for the idDigipos input. This only updates the isolated state.
    const handleDigiposInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setDigiposInput(value);
        setIsDigiposVerified(false);
        setDigiposError('');
        // Also clear related auto-filled fields from the main form data immediately
        setFormData(prev => ({
            ...prev,
            idDigipos: '',
            namaOutlet: '',
            noRs: '',
            salesforce: ''
        }));
    };

    // useEffect now watches the isolated `digiposInput` state. This is the core of the fix.
    useEffect(() => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        const trimmedId = digiposInput.trim();

        // New condition: Only trigger validation logic if input is 10 chars or more.
        if (trimmedId.length < 10) {
            setIsCheckingDigipos(false);
            if (trimmedId.length > 0) {
                setDigiposError('ID Digipos harus minimal 10 karakter.');
            } else {
                setDigiposError('');
            }
            return;
        }

        setIsCheckingDigipos(true);
        setDigiposError('');

        debounceTimeout.current = setTimeout(async () => {
            try {
                const response = await fetch(`/api/digipos-info/${trimmedId}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Error validasi');
                }

                // Success! Update the main form data with verified info.
                setFormData(prev => ({
                    ...prev,
                    idDigipos: trimmedId,
                    namaOutlet: data.namaOutlet,
                    noRs: data.noRs,
                    salesforce: data.salesforce
                }));
                setIsDigiposVerified(true);
                setDigiposError('');

            } catch (error: any) {
                setIsDigiposVerified(false);
                setDigiposError(error.message);
            } finally {
                setIsCheckingDigipos(false);
            }
        }, 800);

        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };

    }, [digiposInput]); // This effect ONLY runs when the `digiposInput` changes.

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
        // We submit the main `formData`, which now contains the verified ID.
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
                                    value={digiposInput}
                                    onChange={handleDigiposInputChange}
                                    className="input-field pl-12" 
                                    placeholder="Ketik ID Digipos Anda (min. 10 karakter)" 
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
