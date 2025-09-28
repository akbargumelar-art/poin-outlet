
import React, { useState } from 'react';
import { User, UserRole, UserProfile } from '../../types';

interface TambahUserPageProps {
    adminAddUser: (user: User) => void;
}

const TambahUserPage: React.FC<TambahUserPageProps> = ({ adminAddUser }) => {
    const [role, setRole] = useState<UserRole>('pelanggan');
    const [common, setCommon] = useState({ id: '', password: '', nama: '', phone: '', email: '' });
    const [pelanggan, setPelanggan] = useState({ owner: '', noRs: '', kabupaten: '', kecamatan: '', salesforce: '', alamat: '' });
    const [admin, setAdmin] = useState({ tap: '' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        let profile: UserProfile = {
            nama: common.nama,
            phone: common.phone,
            email: common.email,
        };

        if (role === 'pelanggan') {
            profile = { ...profile, ...pelanggan };
        } else {
            profile = { ...profile, tap: admin.tap };
        }
        
        const newUser: User = { 
            id: common.id, 
            password: common.password, 
            role: role, 
            points: role === 'pelanggan' ? 0 : undefined, 
            level: role === 'pelanggan' ? 'Bronze' : undefined, 
            kuponUndian: role === 'pelanggan' ? 0 : undefined,
            profile: profile
        };
        adminAddUser(newUser);
    }

    const handleCommonChange = (e: React.ChangeEvent<HTMLInputElement>) => setCommon(p => ({...p, [e.target.name]: e.target.value}));
    const handlePelangganChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setPelanggan(p => ({...p, [e.target.name]: e.target.value}));
    const handleAdminChange = (e: React.ChangeEvent<HTMLInputElement>) => setAdmin(p => ({...p, [e.target.name]: e.target.value}));

    return (
        <div>
             <h1 className="text-3xl font-bold text-gray-700 mb-6">Tambah User Baru</h1>
              <div className="neu-card p-8 max-w-3xl mx-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-gray-600 text-sm font-semibold mb-2">Role User</label>
                        <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="input-field">
                            <option value="pelanggan">Mitra Outlet</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                        <input type="text" name="id" value={common.id} onChange={handleCommonChange} placeholder={role === 'pelanggan' ? 'ID Digipos' : 'Username'} className="input-field" required />
                        <input type="password" name="password" value={common.password} onChange={handleCommonChange} placeholder="Password" className="input-field" required />
                        <input type="text" name="nama" value={common.nama} onChange={handleCommonChange} placeholder={role === 'pelanggan' ? 'Nama Outlet' : 'Nama Lengkap Admin'} className="input-field" required />
                        <input type="email" name="email" value={common.email} onChange={handleCommonChange} placeholder="Email" className="input-field" required />
                        <input type="tel" name="phone" value={common.phone} onChange={handleCommonChange} placeholder="Nomor HP / WhatsApp" className="input-field" required />

                         {role === 'pelanggan' && (
                            <>
                                <input type="text" name="owner" value={pelanggan.owner} onChange={handlePelangganChange} placeholder="Nama Owner" className="input-field" />
                                <input type="text" name="noRs" value={pelanggan.noRs} onChange={handlePelangganChange} placeholder="No. RS" className="input-field" />
                                <input type="text" name="kabupaten" value={pelanggan.kabupaten} onChange={handlePelangganChange} placeholder="Kabupaten" className="input-field" />
                                <input type="text" name="kecamatan" value={pelanggan.kecamatan} onChange={handlePelangganChange} placeholder="Kecamatan" className="input-field" />
                                <input type="text" name="salesforce" value={pelanggan.salesforce} onChange={handlePelangganChange} placeholder="Nama Salesforce" className="input-field" />
                                <textarea name="alamat" value={pelanggan.alamat} onChange={handlePelangganChange} placeholder="Alamat Lengkap" className="input-field md:col-span-2" />
                            </>
                         )}

                         {role === 'admin' && (
                             <input type="text" name="tap" value={admin.tap} onChange={handleAdminChange} placeholder="TAP" className="input-field" />
                         )}
                    </div>
                    
                    <div className="pt-4">
                        <button type="submit" className="w-full neu-button text-red-600">Tambah User</button>
                    </div>
                </form>
            </div>
        </div>
    )
};

export default TambahUserPage;