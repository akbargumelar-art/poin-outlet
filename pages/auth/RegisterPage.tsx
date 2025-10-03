import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Page, Location } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';

interface AvailableOutlet {
    idDigipos: string;
    namaOutlet: string;
    noRs: string;
    salesforce: string;
    tap: string;
}

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

    const [availableOutlets, setAvailableOutlets] = useState<AvailableOutlet[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [isDigiposVerified, setIsDigiposVerified] = useState(false);

    // Fetch available outlets when the component mounts
    useEffect(() => {
        const fetchAvailableOutlets = async () => {
            try {
                const response = await fetch('/api/available-digipos');
                if (!response.ok) throw new Error('Gagal memuat data outlet');
                const data = await response.json();
                setAvailableOutlets(data);
            } catch (error) {
                console.error(error);
                // Optionally show an error to the user
            }
        };
        fetchAvailableOutlets();
    }, []);

    // Handle clicks outside the dropdown to close it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const filteredOutlets = useMemo(() => {
        if (!searchTerm) return availableOutlets;
        const lowercasedTerm = searchTerm.toLowerCase();
        return availableOutlets.filter(outlet =>
            outlet.namaOutlet.toLowerCase().includes(lowercasedTerm) ||
            outlet.idDigipos.toLowerCase().includes(lowercasedTerm)
        );
    }, [searchTerm, availableOutlets]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setIsDropdownOpen(true);
        setIsDigiposVerified(false); // Reset verification if user changes input
         setFormData(prev => ({ // Clear related fields when searching
            ...prev,
            idDigipos: '',
            namaOutlet: '',
            noRs: '',
            salesforce: ''
        }));
    };

    const handleSelectOutlet = (outlet: AvailableOutlet) => {
        setSearchTerm(`${outlet.namaOutlet} (${outlet.idDigipos})`);
        setFormData(prev => ({
            ...prev,
            idDigipos: outlet.idDigipos,
            namaOutlet: outlet.namaOutlet,
            noRs: outlet.noRs,
            salesforce: outlet.salesforce
        }));
        setIsDigiposVerified(true);
        setIsDropdownOpen(false);
    };
    
    // Handler umum untuk semua input LAINNYA.
    const handleOtherInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
             alert('Harap pilih outlet yang valid dari daftar.');
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
                        <div className="relative md:col-span-2" ref={dropdownRef}>
                             <InputWrapper icon={ICONS.idCard}>
                                <input 
                                    type="text" 
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    className="input-field pl-12" 
                                    placeholder="Ketik ID Digipos atau Nama Outlet" 
                                    required 
                                    autoComplete="off"
                                />
                            </InputWrapper>
                             {isDigiposVerified && <p className="text-xs text-green-600 mt-1">✓ Outlet Terpilih</p>}
                             
                             {isDropdownOpen && filteredOutlets.length > 0 && (
                                <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {filteredOutlets.map(outlet => (
                                        <li 
                                            key={outlet.idDigipos}
                                            onClick={() => handleSelectOutlet(outlet)}
                                            className="px-4 py-2 hover:bg-red-100 cursor-pointer"
                                        >
                                            <p className="font-semibold">{outlet.namaOutlet}</p>
                                            <p className="text-sm text-gray-500">{outlet.idDigipos}</p>
                                        </li>
                                    ))}
                                </ul>
                             )}
                        </div>

                        <InputWrapper icon={ICONS.store}><input type="text" name="namaOutlet" value={formData.namaOutlet} readOnly className="input-field-disabled pl-12" placeholder="Nama Outlet" required /></InputWrapper>
                        <InputWrapper icon={ICONS.idCard}><input type="text" name="noRs" value={formData.noRs} readOnly className="input-field-disabled pl-12" placeholder="No. RS" /></InputWrapper>
                        <InputWrapper icon={ICONS.users}><input type="text" name="salesforce" value={formData.salesforce} readOnly className="input-field-disabled pl-12" placeholder="Nama Salesforce" /></InputWrapper>
                        
                        <InputWrapper icon={ICONS.location}>
                            <select name="kabupaten" value={formData.kabupaten} onChange={handleOtherInputChange} className="input-field pl-12" required>
                                <option value="">-- Pilih Kabupaten --</option>
                                {kabupatenOptions.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                        </InputWrapper>
                        <InputWrapper icon={ICONS.location}>
                            <select name="kecamatan" value={formData.kecamatan} onChange={handleOtherInputChange} className="input-field pl-12" required disabled={!formData.kabupaten}>
                                <option value="">-- Pilih Kecamatan --</option>
                                {kecamatanOptions.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                        </InputWrapper>

                        <InputWrapper icon={ICONS.user}><input type="text" name="namaOwner" value={formData.namaOwner} onChange={handleOtherInputChange} className="input-field pl-12" placeholder="Nama Owner"/></InputWrapper>
                        <InputWrapper icon={ICONS.phone}><input type="tel" name="noWhatsapp" value={formData.noWhatsapp} onChange={handleOtherInputChange} className="input-field pl-12" required placeholder="Nomor WhatsApp"/></InputWrapper>

                        <InputWrapper icon={ICONS.lock}><input type="password" name="password" value={formData.password} onChange={handleOtherInputChange} className="input-field pl-12" placeholder="Buat Password"/></InputWrapper>
                        <InputWrapper icon={ICONS.lock}><input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleOtherInputChange} className="input-field pl-12" placeholder="Konfirmasi Password"/></InputWrapper>
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