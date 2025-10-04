import React, { useState } from 'react';
import { Page } from '../../types';
import { ICONS } from '../../constants';
import Icon from '../common/Icon';
import Modal from '../common/Modal';

interface PublicLayoutProps {
    children: React.ReactNode;
    setCurrentPage: (page: Page) => void;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children, setCurrentPage }) => {
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

    const scrollToSection = (sectionId: string) => {
        // If the user is on login/register, first switch to the landing page
        setCurrentPage('landing');
        // We need a slight delay for the page to switch before we can scroll
        setTimeout(() => {
            const section = document.getElementById(sectionId);
            if (section) {
                // Use scrollIntoView with smooth behavior
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    };
    
    const menuItems = [
        { name: 'Home', icon: ICONS.home, action: () => scrollToSection('hero-section') },
        { name: 'Hadiah', icon: ICONS.gift, action: () => scrollToSection('hadiah-section') },
        { name: 'Program', icon: ICONS.program, action: () => scrollToSection('program-section') },
        { name: 'Tentang Kami', icon: ICONS.users, action: () => scrollToSection('tentang-kami-section') },
    ];

    return (
        <div className="min-h-screen neu-bg font-sans">
            <Modal show={isMoreMenuOpen} onClose={() => setIsMoreMenuOpen(false)} title="Menu Lainnya">
                <div className="space-y-3">
                    <button onClick={() => { setIsMoreMenuOpen(false); scrollToSection('pemenang-section'); }} className="w-full text-left p-3 neu-inset rounded-lg hover:bg-slate-200/50 transition-colors">
                        Pemenang Undian
                    </button>
                    <button onClick={() => { setIsMoreMenuOpen(false); scrollToSection('kalkulator-section'); }} className="w-full text-left p-3 neu-inset rounded-lg hover:bg-slate-200/50 transition-colors">
                        Kalkulator Poin
                    </button>
                </div>
            </Modal>

            {/* Header */}
            <header className="sticky top-0 z-30 p-4 md:px-6 shadow-sm neu-bg">
                 <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <img src="/logo.png" alt="Logo Agrabudi Komunika" className="h-8 sm:h-10" />
                    <div className="flex items-center gap-4">
                        <button onClick={() => setCurrentPage('login')} className="neu-button !w-auto px-6 py-2 text-sm">Login</button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="animate-fade-in-up w-full">
                {children}
            </main>
            
            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 h-16 bg-transparent z-40">
                <div className="max-w-4xl mx-auto h-full">
                    <nav className="neu-card-flat w-full h-full flex justify-around items-center rounded-t-2xl md:rounded-b-2xl">
                        {menuItems.map(item => (
                            <button 
                                key={item.name} 
                                onClick={item.action}
                                className="flex flex-col items-center justify-center transition-colors duration-200 w-full h-full text-gray-500 hover:text-red-600"
                            >
                                <Icon path={item.icon} className="w-6 h-6" />
                                <span className="text-xs font-semibold mt-1">{item.name}</span>
                            </button>
                        ))}
                         <button 
                            onClick={() => setIsMoreMenuOpen(true)}
                            className="flex flex-col items-center justify-center transition-colors duration-200 w-full h-full text-gray-500 hover:text-red-600"
                        >
                            <Icon path={ICONS.dashboard} className="w-6 h-6" />
                            <span className="text-xs font-semibold mt-1">Lainnya</span>
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    );
};

export default PublicLayout;
