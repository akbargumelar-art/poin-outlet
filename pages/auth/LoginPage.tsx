
import React, { useState } from 'react';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import { Page } from '../../types';

interface LoginPageProps {
    handleLogin: (id: string, password: string) => boolean;
    setCurrentPage: (page: Page) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ handleLogin, setCurrentPage }) => {
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!handleLogin(id, password)) {
            setError('ID Digipos atau password salah.');
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-4 font-sans neu-bg">
            <div className="w-full max-w-md neu-card p-8 z-10 animate-fade-in-down relative">
                 <button onClick={() => setCurrentPage('landing')} className="absolute top-4 left-4 neu-button-icon text-gray-500 hover:text-red-600 !text-red-600" aria-label="Kembali ke beranda">
                    <Icon path={ICONS.chevronLeft} className="w-6 h-6" />
                </button>
                <div className="text-center mb-8">
                     <img src="/logo.png" alt="Agrabudi Komunika Logo" className="h-12 mx-auto mb-6" />
                    <h1 className="text-2xl font-bold text-gray-700">Program Loyalitas Mitra</h1>
                    <p className="text-gray-500 mt-2">Selamat Datang Kembali!</p>
                </div>
                {error && <p className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="relative mb-6">
                         <Icon path={ICONS.idCard} className="absolute top-1/2 left-4 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                        <input className="input-field pl-12" type="text" value={id} onChange={(e) => setId(e.target.value)} placeholder="ID Digipos" />
                    </div>
                    <div className="relative mb-6">
                        <Icon path={ICONS.lock} className="absolute top-1/2 left-4 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                        <input className="input-field pl-12" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
                    </div>
                    <button className="neu-button text-red-600" type="submit">Login</button>
                </form>
                <p className="text-center text-gray-500 text-sm mt-8">
                    Belum punya akun? <button onClick={() => setCurrentPage('register')} className="font-bold text-red-600">Registrasi</button>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;