
import React, { useState } from 'react';
import { User, UserProfile } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';

interface EditProfilePageProps {
    currentUser: User;
    updateUserProfile: (profile: UserProfile) => void;
    handleLogout: () => void;
}

const EditProfilePage: React.FC<EditProfilePageProps> = ({ currentUser, updateUserProfile, handleLogout }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [profile, setProfile] = useState<UserProfile>(currentUser.profile);
    const [photoPreview, setPhotoPreview] = useState<string | null>(currentUser.profile.photo || null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setProfile(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setPhotoPreview(result);
                setProfile(prev => ({...prev, photo: result}));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => { 
        e.preventDefault(); 
        updateUserProfile(profile); 
        setIsEditing(false);
    };

    const handleCancel = () => {
        setProfile(currentUser.profile);
        setPhotoPreview(currentUser.profile.photo || null);
        setIsEditing(false);
    };

    const isPelanggan = currentUser.role === 'pelanggan';

    const renderField = (label: string, value: string | undefined, name: string, type: 'text' | 'email' | 'tel' | 'textarea' = 'text', readOnly = false) => (
        <div>
            <label className="block text-gray-600 text-sm font-semibold mb-2">{label}</label>
            {isEditing ? (
                type === 'textarea' ? (
                    <textarea name={name} value={value || ''} onChange={handleChange} className="input-field min-h-[80px]" />
                ) : (
                    <input type={type} name={name} value={value || ''} onChange={handleChange} className={readOnly ? "input-field-disabled" : "input-field"} readOnly={readOnly} />
                )
            ) : (
                <p className="w-full p-3 neu-inset rounded-lg text-gray-800 min-h-[46px]">{value || '-'}</p>
            )}
        </div>
    );
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-700">Profil Akun</h1>
                {!isEditing && <button onClick={() => setIsEditing(true)} className="neu-button !w-auto px-6 flex items-center gap-2"><Icon path={ICONS.edit} className="w-5 h-5"/> Edit Profil</button>}
            </div>
            <div className="neu-card p-8 max-w-4xl mx-auto">
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
                           {renderField(`Nama ${isPelanggan ? 'Outlet' : 'Admin'}`, profile.nama, 'nama')}
                           {isPelanggan && renderField('Nama Owner', profile.owner, 'owner')}
                           {renderField('Email', profile.email, 'email', 'email')}
                           {renderField('Nomor HP', profile.phone, 'phone', 'tel')}
                        </div>
                    </div>

                    <div className="space-y-6 pt-6 border-t border-gray-200/80">
                         <h3 className="font-semibold text-gray-700 text-lg">Info {isPelanggan ? 'Outlet' : 'Admin'}</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {isPelanggan && renderField('ID Digipos', currentUser.id, 'id', 'text', true)}
                            {isPelanggan && renderField('No. RS', profile.noRs, 'noRs', 'text', true)}
                            {isPelanggan && renderField('Kabupaten', profile.kabupaten, 'kabupaten')}
                            {isPelanggan && renderField('Kecamatan', profile.kecamatan, 'kecamatan')}
                            {isPelanggan && renderField('Nama Salesforce', profile.salesforce, 'salesforce')}
                            {isPelanggan && renderField('Alamat Lengkap', profile.alamat, 'alamat', 'textarea')}
                            {!isPelanggan && renderField('TAP', profile.tap, 'tap')}
                         </div>
                    </div>
                    
                    {isEditing && (
                        <div className="pt-6 mt-6 border-t border-gray-200/80 flex flex-col md:flex-row gap-4">
                            <button type="submit" className="neu-button text-red-600">Simpan Perubahan</button>
                            <button type="button" onClick={handleCancel} className="neu-button">Batal</button>
                        </div>
                    )}
                </form>

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