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
    const [formData, setFormData] = useState({
        idDigipos: '',
        namaOutlet: '',
        noRs: '',
        kabupaten: '',
        kecamatan: '',
        namaOwner: '',
        noWhatsapp: '',
        salesforce: ''
    });

    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [digiposError, setDigiposError] = useState('');
    const [isDigiposVerified, setIsDigiposVerified] = useState(false);

    const verifyDigiposId = async (id: string) => {
        setIsVerifying(true);
        setDigiposError('');
        try {
            const response = await fetch(`/api/digipos-info/${id}`);
            const data = await response.json();
    
            if (!response.ok) {
                throw new Error(data.message || 'Verification failed');
            }
    
            setFormData(prev => ({
                ...prev,
                namaOutlet: data.namaOutlet,
                noRs: data.noRs,
                salesforce: data.salesforce,
            }));
            setIsDigiposVerified(true);
        } catch (error: any) {
            setDigiposError(error.message);
            setIsDigiposVerified(false);
        } finally {
            setIsVerifying(false);
        }
    };


    // Debounce for Digipos ID verification
    useEffect(() => {
        const handler = setTimeout(() => {
            if (formData.idDigipos.length > 4) {
                verifyDigiposId(formData.idDigipos);
            } else {
                setDigiposError('');
                setIsDigiposVerified(false);
                setFormData(prev => ({ ...prev, namaOutlet: '', noRs: '', salesforce: ''}));
            }
        }, 800);

        return () => {
            clearTimeout(handler);
        };
    }, [formData.idDigipos]);

    const kabupatenOptions = useMemo(() => [...new Set(locations.map(l => l.kabupaten))].sort(), [locations]);
    const kecamatanOptions = useMemo(() => {
        if (!formData.kabupaten) return [];
        return locations.filter(l => l.kabupaten === formData.kabupaten).map(l => l.kecamatan).sort();
    }, [locations, formData.kabupaten]);

    // Effect to auto-select first kecamatan when kabupaten changes
     useEffect(() => {
        if (formData.kabupaten && kecamatanOptions.length > 0) {
            setFormData(prev => ({...prev, kecamatan: kecamatanOptions[0]}));
        } else {
            setFormData(prev => ({...prev, kecamatan: ''}));
        }
    }, [formData.kabupaten, kecamatanOptions]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isDigiposVerified) {
             setDigiposError('Harap gunakan ID Digipos yang valid.');
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
            <div className="w-full max-w-2xl neu-card p-8 z-10 animate-fade-in-down relative">
                 <button onClick={() => setCurrentPage('landing')} className="absolute top-4 left-4 neu-button-icon text-gray-500 hover:text-red-600 !text-red-600" aria-label="Kembali ke beranda">
                    <Icon path={ICONS.chevronLeft} className="w-6 h-6" />
                </button>
                 <div className="text-center mb-8">
                    <img src="/logo.png" alt="Logo Agrabudi Komunika" className="h-12 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-gray-700">Registrasi Mitra Baru</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <InputWrapper icon={ICONS.idCard}>
                                <input type="text" name="idDigipos" value={formData.idDigipos} onChange={handleChange} className="input-field pl-12" placeholder="ID Digipos" required />
                            </InputWrapper>
                            {isVerifying && <p className="text-xs text-blue-600 mt-1">Memeriksa ID...</p>}
                            {digiposError && <p className="text-xs text-red-600 mt-1">{digiposError}</p>}
                            {isDigiposVerified && <p className="text-xs text-green-600 mt-1">✓ ID Digipos Valid</p>}
                        </div>

                        <InputWrapper icon={ICONS.store}><input type="text" name="namaOutlet" value={formData.namaOutlet} onChange={handleChange} className="input-field-disabled pl-12" placeholder="Nama Outlet" required disabled /></InputWrapper>
                        <InputWrapper icon={ICONS.idCard}><input type="text" name="noRs" value={formData.noRs} onChange={handleChange} className="input-field-disabled pl-12" placeholder="No. RS" disabled /></InputWrapper>
                        <InputWrapper icon={ICONS.users}><input type="text" name="salesforce" value={formData.salesforce} onChange={handleChange} className="input-field-disabled pl-12" placeholder="Nama Salesforce" disabled /></InputWrapper>
                        
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
                    </div>
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
