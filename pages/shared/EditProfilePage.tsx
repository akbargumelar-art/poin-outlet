import React, { useState, useMemo } from 'react';
import { User, UserProfile } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';

interface EditProfilePageProps {
    currentUser: User;
    updateUserProfile: (profile: UserProfile, photoFile: File | null) => void;
    handleLogout: () => void;
    handleChangePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
}

const PasswordInput: React.FC<{name: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder: string, autoComplete?: string}> = ({ name, value, onChange, placeholder, autoComplete="off" }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="relative w-full">
            <input 
                type={show ? "text" : "password"} 
                name={name} 
                value={value} 
                onChange={onChange} 
                className="input-field pr-12" 
                placeholder={placeholder} 
                required 
                autoComplete={autoComplete}
            />
            <button type="button" onClick={() => setShow(!show)} className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10">
                <Icon path={show ? ICONS.eyeOff : ICONS.eye} className="w-5 h-5" />
            </button>
        </div>
    );
};


const EditProfilePage: React.FC<EditProfilePageProps> = ({ currentUser, updateUserProfile, handleLogout, handleChangePassword }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [profile, setProfile] = useState<UserProfile>(currentUser.profile);
    const [photoPreview, setPhotoPreview] = useState<string | null>(currentUser.profile.photoUrl || null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);

    const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
    const [passwordError, setPasswordError] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const allTaps = useMemo(() => {
        return ['CIREBON', 'KUNINGAN', 'MAJALENGKA', 'INDRAMAYU', 'Palimanan', 'Lemahabang', 'Luragung', 'Pemuda'].sort();
    }, []);
    
    const allJabatans = ['Head Admin', 'Admin Staff', 'Supervisor Lapangan', 'Koordinator Supervisor'];


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setProfile(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswordData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => { 
        e.preventDefault(); 
        updateUserProfile(profile, photoFile); 
        setIsEditing(false);
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        if (passwordData.newPassword.length < 6) {
            setPasswordError('Password baru harus minimal 6 karakter.');
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmNewPassword) {
            setPasswordError('Konfirmasi password baru tidak cocok.');
            return;
        }
        setIsChangingPassword(true);
        const success = await handleChangePassword(passwordData.oldPassword, passwordData.newPassword);
        setIsChangingPassword(false);
        if (success) {
            setPasswordData({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
        }
    };

    const handleCancel = () => {
        setProfile(currentUser.profile);
        setPhotoPreview(currentUser.profile.photoUrl || null);
        setPhotoFile(null);
        setIsEditing(false);
    };

    const isPelanggan = currentUser.role === 'pelanggan';

    const renderField = (label: string, value: string | undefined, name: string, type: 'text' | 'email' | 'tel' | 'textarea' = 'text', readOnly = false, options?: string[]) => {
        const isSelect = Array.isArray(options);
        return (
            <div>
                <label className="block text-gray-600 text-sm font-semibold mb-2">{label}</label>
                {isEditing && !readOnly ? (
                    isSelect ? (
                         <select name={name} value={value || ''} onChange={handleChange} className="input-field">
                            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                         </select>
                    ) : type === 'textarea' ? (
                        <textarea name={name} value={value || ''} onChange={handleChange} className="input-field min-h-[80px]" />
                    ) : (
                        <input type={type} name={name} value={value || ''} onChange={handleChange} className={readOnly ? "input-field-disabled" : "input-field"} readOnly={readOnly} />
                    )
                ) : (
                    <p className="w-full p-3 neu-inset rounded-lg text-gray-800 min-h-[46px]">{value || '-'}</p>
                )}
            </div>
        );
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-700">Profil Akun</h1>
                {!isEditing && <button onClick={() => setIsEditing(true)} className="neu-button !w-auto px-6 flex items-center gap-2"><Icon path={ICONS.edit} className="w-5 h-5"/> Edit Profil</button>}
            </div>
            <div className="neu-card p-8 max-w-4xl mx-auto space-y-8">
                <form onSubmit={handleSubmit}>
                     <div className="flex flex-col md:flex-row items-center gap-8 mb-6">
                        <div className="flex-shrink-0">
                            <div className="relative w-32 h-32 rounded-full neu-card flex items-center justify-center font-bold text-5xl text-red-500 overflow-hidden">
                                {photoPreview ? <img src={photoPreview} alt="profile" className="w-full h-full object-cover"/> : profile.nama.charAt(0)}
                            </div>
                            {isEditing && (<>
                                <label htmlFor="photo-upload" className="block text-center text-sm text-red-600 font-semibold cursor-pointer mt-2">Ubah Foto</label>
                                <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden"/>
                            </>)}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow w-full">
                           {isPelanggan ? (
                               <>
                                {renderField('Nama Outlet', profile.nama, 'nama')}
                                {renderField('Nama Owner', profile.owner, 'owner')}
                               </>
                           ) : (
                               <>
                                {renderField('Nama Lengkap', profile.nama, 'nama')}
                                {renderField('Username', currentUser.id, 'id', 'text', true)}
                               </>
                           )}
                           {renderField('Email', profile.email, 'email', 'email')}
                           {renderField(isPelanggan ? 'Nomor WhatsApp' : 'Nomor HP', profile.phone, 'phone', 'tel')}
                        </div>
                    </div>
                    
                    <div className="space-y-6 pt-6 border-t border-gray-200/80">
                         <h3 className="font-semibold text-gray-700 text-lg">Info Detail</h3>
                        {isPelanggan ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {renderField('ID Digipos', currentUser.id, 'id', 'text', true)}
                                {renderField('No. RS', profile.noRs, 'noRs', 'text', true)}
                                {renderField('TAP', profile.tap, 'tap', 'text', true)}
                                {renderField('Nama Salesforce', profile.salesforce, 'salesforce')}
                                {renderField('Kabupaten', profile.kabupaten, 'kabupaten')}
                                {renderField('Kecamatan', profile.kecamatan, 'kecamatan')}
                                {renderField('Alamat Lengkap', profile.alamat, 'alamat', 'textarea')}
                             </div>
                        ) : (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {renderField('TAP', profile.tap, 'tap', 'text', false, allTaps)}
                                {renderField('Jabatan', profile.jabatan, 'jabatan', 'text', false, allJabatans)}
                                {renderField('Alamat', profile.alamat, 'alamat', 'textarea')}
                             </div>
                        )}
                    </div>
                    
                    {isEditing && (
                        <div className="pt-6 mt-6 border-t border-gray-200/80 flex flex-col md:flex-row gap-4">
                            <button type="submit" className="neu-button text-red-600">Simpan Perubahan</button>
                            <button type="button" onClick={handleCancel} className="neu-button">Batal</button>
                        </div>
                    )}
                </form>

                <div className="pt-6 border-t border-gray-200/80">
                    <h3 className="font-semibold text-gray-700 text-lg mb-4">Ganti Password</h3>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                        <PasswordInput name="oldPassword" value={passwordData.oldPassword} onChange={handlePasswordChange} placeholder="Password Lama" autoComplete="current-password" />
                        <PasswordInput name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} placeholder="Password Baru" autoComplete="new-password" />
                        <PasswordInput name="confirmNewPassword" value={passwordData.confirmNewPassword} onChange={handlePasswordChange} placeholder="Konfirmasi Password Baru" autoComplete="new-password" />
                        {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
                        <button type="submit" className="neu-button text-red-600 !w-auto px-6" disabled={isChangingPassword}>
                            {isChangingPassword ? 'Memproses...' : 'Ubah Password'}
                        </button>
                    </form>
                </div>

                <div className="pt-6 mt-6 border-t border-gray-200/80">
                     <button type="button" onClick={handleLogout} className="w-full md:w-auto md:px-6 neu-button flex items-center justify-center gap-2">
                        <Icon path={ICONS.logout} className="w-5 h-5"/>Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditProfilePage;