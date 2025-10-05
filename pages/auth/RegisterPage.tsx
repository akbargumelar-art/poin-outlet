import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { Page, Location } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';

interface RegisterPageProps {
    handleRegister: (formData: any) => Promise<boolean>;
    setCurrentPage: (page: Page) => void;
    locations: Location[];
}

const InputWrapper: React.FC<{icon: string, children: React.ReactNode}> = memo(({icon, children}) => (
    <div className="relative w-full">
        <Icon path={icon} className="absolute top-1/2 left-4 -translate-y-1/2 w-5 h-5 text-gray-400 z-10"/>
        {children}
    </div>
));

const PasswordInput: React.FC<{name: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder: string}> = ({ name, value, onChange, placeholder }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="relative w-full">
            <Icon path={ICONS.lock} className="absolute top-1/2 left-4 -translate-y-1/2 w-5 h-5 text-gray-400 z-10"/>
            <input 
                type={show ? "text" : "password"} 
                name={name} 
                value={value} 
                onChange={onChange} 
                className="input-field pl-12 pr-12" 
                placeholder={placeholder} 
                required 
            />
            <button type="button" onClick={() => setShow(!show)} className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10">
                <Icon path={show ? ICONS.trash : ICONS.edit} className="w-5 h-5" />
            </button>
        </div>
    );
};

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
            const response = await fetch(`/api/validate-digipos/${formData.idDigipos}`);
            const data = await response.json();

            if (!response.ok) {
                setDigiposValidation({ status: 'invalid', message: data.message });
                setFormData(prev => ({ ...prev, namaOutlet: '', noRs: '', salesforce: '' }));
            } else {
                setDigiposValidation({ status: 'valid', message: 'ID Ditemukan & Valid' });
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
        if (name === 'idDigipos') {
            setDigiposValidation({ status: 'idle', message: '' });
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Konfirmasi password tidak cocok.');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password harus minimal 6 karakter.');
            return;
        }
        
        if (!isDigiposValidated) {
            setError('Harap validasi ID Digipos Anda terlebih dahulu dengan keluar dari kolom input.');
            return;
        }

        setIsLoading(true);
        const success = await handleRegister(formData);
        // App.tsx handles success/error modals, so we just need to manage loading state.
        if (!success) {
            // The error state in App.tsx will be shown via a modal.
            // But we can reset the validation here if the error was, for example, "already registered".
            setDigiposValidation({ status: 'invalid', message: 'Registrasi gagal. Silakan periksa kembali data Anda.' });
        }
        setIsLoading(false);
    };
    
    return (
        <div className="min-h-screen flex justify-center items-center p-4">
            <div className="w-full max-w-lg neu-card p-6 z-10 relative">
                <button onClick={() => setCurrentPage('landing')} className="absolute top-4 left-4 text-gray-400 hover:text-red-500 transition-colors" aria-label="Kembali ke Beranda">
                    <Icon path={ICONS.chevronLeft} className="w-8 h-8"/>
                </button>
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-700">Registrasi Mitra Baru</h1>
                    <p className="text-gray-500 mt-1">Lengkapi data di bawah ini untuk memulai.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        <div>
                            <InputWrapper icon={ICONS.idCard}>
                                <input 
                                    type="text" 
                                    name="idDigipos" 
                                    value={formData.idDigipos} 
                                    onChange={handleChange}
                                    onBlur={handleValidateDigipos}
                                    className="input-field pl-12" 
                                    placeholder="ID Digipos" 
                                    required 
                                    readOnly={isDigiposValidated}
                                />
                            </InputWrapper>
                            {digiposValidation.status !== 'idle' && (
                                <p className={`text-xs mt-1 pl-1 ${
                                    digiposValidation.status === 'valid' ? 'text-green-600' :
                                    digiposValidation.status === 'invalid' ? 'text-red-600' : 'text-gray-500'
                                }`}>
                                    {digiposValidation.message}
                                </p>
                            )}
                        </div>
                        
                        <InputWrapper icon={ICONS.store}>
                            <input type="text" name="namaOutlet" value={formData.namaOutlet} onChange={handleChange} className="input-field pl-12 input-field-disabled" placeholder="Nama Outlet" required readOnly />
                        </InputWrapper>
                        <InputWrapper icon={ICONS.idCard}>
                            <input type="text" name="noRs" value={formData.noRs} onChange={handleChange} className="input-field pl-12 input-field-disabled" placeholder="No. RS" required readOnly />
                        </InputWrapper>
                        <InputWrapper icon={ICONS.users}>
                           <input type="text" name="salesforce" value={formData.salesforce} onChange={handleChange} className="input-field pl-12 input-field-disabled" placeholder="Nama Salesforce" required readOnly />
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
                        <InputWrapper icon={ICONS.user}><input type="text" name="namaOwner" value={formData.namaOwner} onChange={handleChange} className="input-field pl-12" placeholder="Nama Owner" required /></InputWrapper>
                        <InputWrapper icon={ICONS.phone}>
                            <input 
                                type="tel" 
                                name="noWhatsapp" 
                                value={formData.noWhatsapp} 
                                onChange={handleChange} 
                                className="input-field pl-12" 
                                required 
                                placeholder="Nomor WhatsApp"
                                minLength={10}
                                pattern="[0-9]*"
                            />
                        </InputWrapper>
                        <PasswordInput name="password" value={formData.password} onChange={handleChange} placeholder="Buat Password" />
                        <PasswordInput name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Konfirmasi Password" />
                    </div>
                     {error && <p className="text-sm text-red-600 mt-2 text-center">{error}</p>}
                    <button type="submit" className="neu-button text-red-600" disabled={isLoading || !isDigiposValidated}>
                        {isLoading ? 'Mendaftar...' : 'Registrasi'}
                    </button>
                </form>
                <p className="text-center text-gray-500 text-sm mt-4">
                    Sudah punya akun? <button onClick={() => setCurrentPage('login')} className="font-bold text-red-600">Login di sini</button>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;