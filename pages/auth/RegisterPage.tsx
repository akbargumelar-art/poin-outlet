
import React, { useState, useEffect } from 'react';
import { User, Page, LocationData, DigiposData } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';

interface RegisterPageProps {
    handleRegister: (formData: any) => void;
    setCurrentPage: (page: Page) => void;
    users: User[];
    MOCK_LOCATION_DATA: LocationData;
    MOCK_DIGIPOS_DATA: DigiposData;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ handleRegister, setCurrentPage, users, MOCK_LOCATION_DATA, MOCK_DIGIPOS_DATA }) => {
    const [formData, setFormData] = useState({ idDigipos: '', namaOutlet: '', noRs: '', kabupaten: 'Kabupaten Cirebon', kecamatan: '', namaOwner: '', noWhatsapp: '', namaSalesforce: '' });
    const [error, setError] = useState('');

    useEffect(() => {
        const data = MOCK_DIGIPOS_DATA[formData.idDigipos];
        if (data) {
            setFormData(prev => ({ ...prev, namaOutlet: data.namaOutlet, noRs: data.noRs }));
            setError('');
        } else if (formData.idDigipos.length > 4) {
             setFormData(prev => ({ ...prev, namaOutlet: '', noRs: '' }));
             setError('ID Digipos tidak ditemukan.');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.idDigipos]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!MOCK_DIGIPOS_DATA[formData.idDigipos]) return setError('ID Digipos harus valid.');
        if (users.find(u => u.id === formData.idDigipos)) return setError('ID Digipos sudah terdaftar.');
        handleRegister(formData);
    };
    
    const kecamatanOptions = MOCK_LOCATION_DATA[formData.kabupaten] ? Object.keys(MOCK_LOCATION_DATA[formData.kabupaten]) : [];
    const salesforceOptions = (formData.kabupaten && formData.kecamatan && MOCK_LOCATION_DATA[formData.kabupaten]?.[formData.kecamatan]) ? MOCK_LOCATION_DATA[formData.kabupaten][formData.kecamatan] : [];
    
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
                    <img src="/logo.png" alt="Agrabudi Komunika Logo" className="h-12 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-gray-700">Registrasi Mitra Baru</h1>
                </div>
                {error && <p className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputWrapper icon={ICONS.idCard}><input type="text" name="idDigipos" value={formData.idDigipos} onChange={handleChange} className="input-field pl-12" placeholder="ID Digipos"/></InputWrapper>
                        <InputWrapper icon={ICONS.store}><input type="text" name="namaOutlet" value={formData.namaOutlet} className="input-field-disabled pl-12" readOnly placeholder="Nama Outlet"/></InputWrapper>
                        <InputWrapper icon={ICONS.idCard}><input type="text" name="noRs" value={formData.noRs} className="input-field-disabled pl-12" readOnly placeholder="No. RS"/></InputWrapper>
                        <InputWrapper icon={ICONS.location}><select name="kabupaten" value={formData.kabupaten} onChange={handleChange} className="input-field pl-12">{Object.keys(MOCK_LOCATION_DATA).map(kab => <option key={kab} value={kab}>{kab}</option>)}</select></InputWrapper>
                        <InputWrapper icon={ICONS.location}><select name="kecamatan" value={formData.kecamatan} onChange={handleChange} className="input-field pl-12" disabled={!formData.kabupaten}><option value="">Pilih Kecamatan</option>{kecamatanOptions.map(kec => <option key={kec} value={kec}>{kec}</option>)}</select></InputWrapper>
                        <InputWrapper icon={ICONS.users}><select name="namaSalesforce" value={formData.namaSalesforce} onChange={handleChange} className="input-field pl-12" disabled={!formData.kecamatan}><option value="">Pilih Salesforce</option>{salesforceOptions.map(sf => <option key={sf} value={sf}>{sf}</option>)}</select></InputWrapper>
                        <InputWrapper icon={ICONS.user}><input type="text" name="namaOwner" value={formData.namaOwner} onChange={handleChange} className="input-field pl-12" required placeholder="Nama Owner"/></InputWrapper>
                        <InputWrapper icon={ICONS.phone}><input type="tel" name="noWhatsapp" value={formData.noWhatsapp} onChange={handleChange} className="input-field pl-12" required placeholder="Nomor WhatsApp"/></InputWrapper>
                    </div>
                    <button type="submit" className="neu-button text-red-600">Registrasi</button>
                </form>
                <p className="text-center text-sm mt-6">Sudah punya akun? <button onClick={() => setCurrentPage('login')} className="font-bold text-red-600">Login</button></p>
            </div>
        </div>
    );
};

export default RegisterPage;