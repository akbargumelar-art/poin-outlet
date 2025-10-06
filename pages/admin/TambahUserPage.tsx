
import React, { useState } from 'react';
import { User, UserRole, UserProfile } from '../../types';

// FIX: Refactored to correctly create a discriminated union.
// The `role` property is now defined within the conditional blocks
// to ensure it receives a narrowed literal type, which is necessary
// for TypeScript's type guards to work correctly.
const getInitialFormData = (role: UserRole) => {
    const common = {
        id: '', // Username or ID Digipos
        password: '',
        nama: '', // Nama Lengkap or Nama Outlet
        email: '',
        phone: '', // Nomor HP or Nomor WhatsApp
        tap: '',
    };
    if (role === 'pelanggan') {
        return {
            ...common,
            role, // `role` is narrowed to 'pelanggan' here
            noRs: '',
            salesforce: '',
            kabupaten: '',
            kecamatan: '',
            owner: '', // Nama Owner
            alamat: '', // Alamat Lengkap
        };
    }
    return {
        ...common,
        role, // `role` is narrowed to 'admin' | 'supervisor' | 'operator' here
        jabatan: '',
    };
};


// FIX: Define a type for the form data state based on the function's return type.
type FormData = ReturnType<typeof getInitialFormData>;

interface TambahUserPageProps {
    adminAddUser: (user: User) => void;
}

const TambahUserPage: React.FC<TambahUserPageProps> = ({ adminAddUser }) => {
    // FIX: Explicitly type the formData state with the union type `FormData`.
    const [formData, setFormData] = useState<FormData>(getInitialFormData('pelanggan'));

    const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newRole = e.target.value as UserRole;
        setFormData(getInitialFormData(newRole));
    };
    
    // FIX: Refactored handleChange to properly update state with a discriminated union.
    // The previous implementation could break the discriminated union type, causing type guards in the JSX to fail.
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newState = { ...prev };
            // Using `any` here is a pragmatic way to handle dynamic keys while preserving the object's shape.
            (newState as any)[name] = value;
            return newState;
        });
    }

    // FIX: Refactored handleSubmit to be type-safe when dealing with the `formData` union type.
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const { id, password, role } = formData;
        
        let profile: UserProfile;

        if (formData.role === 'pelanggan') {
            profile = {
                nama: formData.nama,
                email: formData.email,
                phone: formData.phone,
                tap: formData.tap,
                noRs: formData.noRs,
                owner: formData.owner,
                salesforce: formData.salesforce,
                kabupaten: formData.kabupaten,
                kecamatan: formData.kecamatan,
                alamat: formData.alamat,
            };
        } else { // admin, supervisor, or operator
             profile = {
                nama: formData.nama,
                email: formData.email,
                phone: formData.phone,
                tap: formData.tap,
                jabatan: formData.jabatan,
            };
        }
        
        const newUser: User = { 
            id, 
            password, 
            role, 
            points: role === 'pelanggan' ? 0 : undefined, 
            level: role === 'pelanggan' ? 'Bronze' : undefined, 
            kuponUndian: role === 'pelanggan' ? 0 : undefined,
            profile
        };

        adminAddUser(newUser);
        setFormData(getInitialFormData(formData.role)); // Reset form after submission
    }

    return (
        <div>
             <h1 className="text-2xl md:text-3xl font-bold text-gray-700 mb-6">Tambah User Baru</h1>
              <div className="neu-card p-8 max-w-3xl mx-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-gray-600 text-sm font-semibold mb-2">Role User</label>
                        <select value={formData.role} onChange={handleRoleChange} className="input-field">
                            <option value="pelanggan">Mitra Outlet</option>
                            <option value="admin">Admin</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="operator">Operator</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                        {/* Common Fields */}
                        <input type="text" name="id" value={formData.id} onChange={handleChange} placeholder={formData.role === 'pelanggan' ? 'ID Digipos' : 'Username'} className="input-field" required />
                        <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Password" className="input-field" required />
                        <input type="text" name="nama" value={formData.nama} onChange={handleChange} placeholder={formData.role === 'pelanggan' ? 'Nama Outlet' : 'Nama Lengkap'} className="input-field" required />
                        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="input-field" required />
                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder={formData.role === 'pelanggan' ? 'Nomor WhatsApp' : 'Nomor HP'} className="input-field" required />
                        <input type="text" name="tap" value={formData.tap} onChange={handleChange} placeholder="TAP" className="input-field" required />
                        
                         {formData.role === 'pelanggan' && (
                            <>
                                <input type="text" name="noRs" value={formData.noRs} onChange={handleChange} placeholder="No. RS" className="input-field" />
                                <input type="text" name="owner" value={formData.owner} onChange={handleChange} placeholder="Nama Owner" className="input-field" />
                                <input type="text" name="salesforce" value={formData.salesforce} onChange={handleChange} placeholder="Nama Salesforce" className="input-field" />
                                <input type="text" name="kabupaten" value={formData.kabupaten} onChange={handleChange} placeholder="Kabupaten" className="input-field" />
                                <input type="text" name="kecamatan" value={formData.kecamatan} onChange={handleChange} placeholder="Kecamatan" className="input-field" />
                                <textarea name="alamat" value={formData.alamat} onChange={handleChange} placeholder="Alamat Lengkap" className="input-field md:col-span-2" />
                            </>
                         )}

                         {(formData.role === 'admin' || formData.role === 'supervisor' || formData.role === 'operator') && (
                             <input type="text" name="jabatan" value={formData.jabatan} onChange={handleChange} placeholder="Jabatan" className="input-field" />
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