import React, { useState, useEffect, useRef } from 'react';
import { User, Page } from '../../types';
import { ICONS } from '../../constants';
import Icon from '../common/Icon';

interface MainLayoutProps {
    children: React.ReactNode;
    currentUser: User;
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
    handleLogout: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, currentUser, currentPage, setCurrentPage, handleLogout }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // New Menu order for Admin
    const adminMenu = [
        { name: 'Mitra', icon: ICONS.users, page: 'manajemenPelanggan' as Page },
        { name: 'Program', icon: ICONS.program, page: 'manajemenProgram' as Page },
        { name: 'Home', icon: ICONS.dashboard, page: 'adminDashboard' as Page },
        { name: 'Hadiah', icon: ICONS.gift, page: 'manajemenHadiah' as Page },
        { name: 'Nomor', icon: ICONS.simCard, page: 'manajemenNomor' as Page },
        { name: 'Tukar Poin', icon: ICONS.history, page: 'manajemenPenukaran' as Page },
        { name: 'Undian', icon: ICONS.ticket, page: 'manajemenUndian' as Page },
        { name: 'Transaksi', icon: ICONS.calculator, page: 'manajemenPoin' as Page },
        { name: 'Notifikasi', icon: ICONS.whatsapp, page: 'manajemenNotifikasi' as Page },
    ];

    // New Menu order for Supervisor
    const supervisorMenu = [
        { name: 'Mitra', icon: ICONS.users, page: 'manajemenPelanggan' as Page },
        { name: 'Program', icon: ICONS.program, page: 'manajemenProgram' as Page },
        { name: 'Home', icon: ICONS.dashboard, page: 'adminDashboard' as Page },
        { name: 'Tukar Poin', icon: ICONS.history, page: 'manajemenPenukaran' as Page },
        { name: 'Nomor Spesial', icon: ICONS.simCard, page: 'nomorSpesial' as Page },
        { name: 'Hadiah', icon: ICONS.gift, page: 'manajemenHadiah' as Page },
        { name: 'Undian', icon: ICONS.ticket, page: 'manajemenUndian' as Page },
    ];
    
    const pelangganMenu = [
        { name: 'Program', icon: ICONS.trophy, page: 'pencapaianProgram' as Page },
        { name: 'Hadiah', icon: ICONS.gift, page: 'tukarPoin' as Page },
        { name: 'Home', icon: ICONS.home, page: 'pelangganDashboard' as Page },
        { name: 'Nomor Spesial', icon: ICONS.simCard, page: 'nomorSpesial' as Page },
        { name: 'History', icon: ICONS.history, page: 'historyPembelian' as Page },
    ];

    const operatorMenu = [
        { name: 'Home', icon: ICONS.simCard, page: 'manajemenNomor' as Page },
    ];

    const MENU_ITEMS: { [key in User['role'] | 'default']?: any[] } = {
        pelanggan: pelangganMenu,
        admin: adminMenu,
        supervisor: supervisorMenu,
        operator: operatorMenu,
    };

    const navItems = MENU_ITEMS[currentUser.role] || [];
    const isPelanggan = currentUser.role === 'pelanggan';

    const shouldCollapseMenu = !isPelanggan && navItems.length > 5;
    const mainItems = shouldCollapseMenu ? navItems.slice(0, 4) : navItems;
    const dropdownItems = shouldCollapseMenu ? navItems.slice(4) : [];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    return (
        <div className="h-screen w-full flex flex-col font-sans neu-bg">
            <div className="flex-shrink-0 w-full">
                <header className="w-full max-w-4xl xl:max-w-7xl mx-auto h-16 flex items-center justify-between px-4 md:px-6">
                    <img src="/logo.png" alt="Logo Agrabudi Komunika" className="h-12 sm:h-14" />
                    <div className="flex items-center gap-4">
                        <button onClick={() => setCurrentPage('editProfile')} className="flex items-center gap-3 group">
                            <div className="text-right">
                                <p className="font-semibold text-gray-700 group-hover:text-red-600 transition-colors">{currentUser.profile.nama}</p>
                                <p className="text-sm text-red-600 capitalize">{isPelanggan ? 'Mitra Outlet' : currentUser.role}</p>
                            </div>
                            <div className="w-11 h-11 rounded-full neu-card flex items-center justify-center font-bold text-xl text-red-500 overflow-hidden">
                               {currentUser.profile.photoUrl ? <img src={currentUser.profile.photoUrl} alt="profile" className="w-full h-full object-cover"/> : currentUser.profile.nama.charAt(0)}
                            </div>
                        </button>
                        <button onClick={handleLogout} className="neu-button-icon group" title="Logout">
                            <Icon path={ICONS.logout} className="w-6 h-6 text-red-500 group-hover:text-red-700 transition-colors" />
                        </button>
                    </div>
                </header>
            </div>
            <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-32 animate-fade-in-up w-full">
                <div className="max-w-4xl xl:max-w-7xl mx-auto w-full">
                    {children}
                </div>
            </main>
             <div className="fixed bottom-0 left-0 right-0 h-16 bg-transparent z-50">
                <div className="w-full max-w-4xl xl:max-w-7xl mx-auto h-full px-4 xl:px-0">
                    <nav className="neu-card-flat w-full h-full flex justify-around items-center rounded-t-2xl xl:rounded-2xl xl:mb-4">
                        {mainItems.map(item => {
                            const page = (item as { page: Page }).page;
                            const action = (item as { action: () => void }).action;
                            const isActive = currentPage === page;
                            return (
                                <button 
                                    key={item.name} 
                                    onClick={() => action ? action() : setCurrentPage(page)} 
                                    className={`flex flex-col items-center justify-center transition-colors duration-200 w-full h-full ${isActive ? 'text-red-600' : 'text-gray-500'}`}
                                >
                                    <div className={`p-2 rounded-full transition-all duration-200 ${isActive ? 'neu-inset' : ''}`}>
                                        <Icon path={item.icon} className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-semibold mt-1">{item.name}</span>
                                </button>
                            );
                        })}
                        {shouldCollapseMenu && (
                            <div ref={dropdownRef} className="relative w-full h-full flex items-center justify-center">
                                {isDropdownOpen && (
                                    <div className="absolute bottom-full right-0 mb-2 w-48 neu-card-flat rounded-lg p-2 shadow-lg z-20">
                                        {dropdownItems.map(item => {
                                            const page = (item as { page: Page }).page;
                                            const action = (item as { action: () => void }).action;
                                            return(
                                                <button
                                                    key={item.name}
                                                    onClick={() => {
                                                        if (action) action();
                                                        else setCurrentPage(page);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left p-3 rounded-md flex items-center gap-3 transition-colors ${currentPage === page ? 'text-red-600 bg-slate-200/50' : 'text-gray-600 hover:bg-slate-100'}`}
                                                >
                                                    <Icon path={item.icon} className="w-5 h-5" />
                                                    <span className="font-semibold text-sm">{item.name}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                                <button
                                    onClick={() => setIsDropdownOpen(prev => !prev)}
                                    className={`flex flex-col items-center justify-center transition-colors duration-200 w-full h-full ${isDropdownOpen ? 'text-red-600' : 'text-gray-500'}`}
                                >
                                    <div className={`p-2 rounded-full transition-all duration-200 ${isDropdownOpen ? 'neu-inset' : ''}`}>
                                        <Icon path={ICONS.dashboard} className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-semibold mt-1">Lainnya</span>
                                </button>
                            </div>
                        )}
                    </nav>
                </div>
            </div>
        </div>
    );
};

export default MainLayout;