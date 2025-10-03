import React from 'react';
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
    const adminMenu = [
        { name: 'Home', icon: ICONS.dashboard, page: 'adminDashboard' as Page },
        { name: 'Mitra', icon: ICONS.users, page: 'manajemenPelanggan' as Page },
        { name: 'Program', icon: ICONS.program, page: 'manajemenProgram' as Page },
        { name: 'Hadiah', icon: ICONS.gift, page: 'manajemenHadiah' as Page },
        { name: 'Undian', icon: ICONS.ticket, page: 'manajemenUndian' as Page },
        { name: 'Transaksi', icon: ICONS.history, page: 'manajemenPoin' as Page }
    ];

    const supervisorMenu = [
        { name: 'Mitra', icon: ICONS.users, page: 'manajemenPelanggan' as Page },
        { name: 'Program', icon: ICONS.program, page: 'manajemenProgram' as Page },
        { name: 'Home', icon: ICONS.dashboard, page: 'adminDashboard' as Page },
        { name: 'Undian', icon: ICONS.ticket, page: 'manajemenUndian' as Page },
        { name: 'Hadiah', icon: ICONS.gift, page: 'manajemenHadiah' as Page },
    ];

    const MENU_ITEMS = {
        pelanggan: [
            { name: 'Program', icon: ICONS.trophy, page: 'pencapaianProgram' as Page },
            { name: 'Hadiah', icon: ICONS.gift, page: 'tukarPoin' as Page },
            { name: 'Home', icon: ICONS.dashboard, page: 'pelangganDashboard' as Page },
            { name: 'History', icon: ICONS.history, page: 'historyPembelian' as Page },
            { name: 'Logout', icon: ICONS.logout, action: handleLogout }
        ],
        admin: adminMenu,
        supervisor: supervisorMenu,
    };

    const navItems = MENU_ITEMS[currentUser.role] || [];
    const isPelanggan = currentUser.role === 'pelanggan';

    return (
        <div className="h-screen w-full flex flex-col font-sans neu-bg">
            <div className="flex-shrink-0 w-full">
                <header className="max-w-7xl mx-auto h-16 flex items-center justify-between px-4 md:px-6">
                    <img src="/logo.png" alt="Logo Agrabudi Komunika" className="h-8 sm:h-9" />
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
                    </div>
                </header>
            </div>
            <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 animate-fade-in-up w-full">
                <div className="max-w-7xl mx-auto w-full">
                    {children}
                </div>
            </main>
             <div className="fixed bottom-0 left-0 right-0 h-16 bg-transparent z-50">
                <div className="max-w-7xl mx-auto h-full">
                    <nav className="neu-card-flat w-full h-full flex justify-around items-center rounded-t-2xl md:rounded-b-2xl">
                        {navItems.map(item => {
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
                            )
                        })}
                    </nav>
                </div>
            </div>
        </div>
    );
};

export default MainLayout;