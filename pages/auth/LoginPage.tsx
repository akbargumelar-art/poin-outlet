import React, { useState } from 'react';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import { Page } from '../../types';

interface LoginPageProps {
    handleLogin: (id: string, password: string) => Promise<boolean>;
    setCurrentPage: (page: Page) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ handleLogin, setCurrentPage }) => {
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        const loginSuccess = await handleLogin(id, password);
        if (!loginSuccess) {
            setError('ID Digipos atau password salah.');
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex flex-col justify-center items-center px-4 py-10 font-sans">
            <div className="w-full max-w-xs neu-card p-8 z-10 relative">
                 <button onClick={() => setCurrentPage('landing')} className="absolute top-4 left-4 text-gray-400 hover:text-red-500 transition-colors" aria-label="Kembali ke Beranda">
                    <Icon path={ICONS.chevronLeft} className="w-8 h-8"/>
                 </button>
                <div className="text-center mb-8">
                     <img src="/logo.png" alt="Logo Agrabudi Komunika" className="h-10 sm:h-12 mx-auto mb-6" />
                    <h1 className="text-2xl font-bold text-gray-700">Program Loyalitas Mitra</h1>
                    <p className="text-gray-500 mt-2">Selamat Datang Kembali!</p>
                </div>
                {error && <p className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="relative mb-6">
                         <Icon path={ICONS.idCard} className="absolute top-1/2 left-4 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                        <input className="input-field pl-12" type="text" value={id} onChange={(e) => setId(e.target.value)} placeholder="ID Digipos" required/>
                    </div>
                    <div className="relative mb-6">
                        <Icon path={ICONS.lock} className="absolute top-1/2 left-4 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                        <input className="input-field pl-12 pr-12" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required/>
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                           <Icon path={showPassword ? ICONS.eyeOff : ICONS.eye} className="w-5 h-5" />
                        </button>
                    </div>
                    <button className="neu-button text-red-600" type="submit" disabled={isLoading}>
                        {isLoading ? 'Memproses...' : 'Login'}
                    </button>
                </form>
                <p className="text-center text-gray-500 text-sm mt-8">
                    Belum punya akun? <button onClick={() => setCurrentPage('register')} className="font-bold text-red-600">Registrasi</button>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;