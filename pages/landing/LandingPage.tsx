import React, { useRef } from 'react';
import { Page, Reward, RunningProgram, RaffleWinner, LoyaltyProgram } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';
import PemenangUndian from '../../components/PemenangUndian';
import SimulasiPoin from '../../components/SimulasiPoin';

interface LandingPageProps {
    setCurrentPage: (page: Page) => void;
    rewards: Reward[];
    runningPrograms: RunningProgram[];
    raffleWinners: RaffleWinner[];
    loyaltyPrograms: LoyaltyProgram[];
}

const LandingPage: React.FC<LandingPageProps> = ({ setCurrentPage, rewards, runningPrograms, raffleWinners, loyaltyPrograms }) => {
    const rewardsScrollContainer = useRef<HTMLDivElement>(null);
    const programsScrollContainer = useRef<HTMLDivElement>(null);

    const handleNav = (direction: 'left' | 'right', containerRef: React.RefObject<HTMLDivElement>) => {
        if (containerRef.current) {
            const container = containerRef.current;
            const scrollAmount = container.offsetWidth * 0.8;

            if (direction === 'right') {
                // If near the end, loop to the beginning
                if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 1) {
                    container.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                }
            } else { // direction === 'left'
                // If at the beginning, loop to the end
                if (container.scrollLeft === 0) {
                    container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
                } else {
                    container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
                }
            }
        }
    };
    
    const formatDateRange = (start: string, end: string) => {
        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
        const startDate = new Date(start).toLocaleDateString('id-ID', options);
        const endDate = new Date(end).toLocaleDateString('id-ID', options);
        return `${startDate} - ${endDate}`;
    };

    return (
        <div className="relative">
            <header className="p-4 md:p-6">
                <div className="w-full max-w-3xl xl:max-w-6xl mx-auto flex justify-between items-center">
                    <img src="/logo.png" alt="Logo Agrabudi Komunika" className="h-8 sm:h-10" />
                    <button onClick={() => setCurrentPage('login')} className="neu-button !w-auto px-6 py-2 text-sm">Login</button>
                </div>
            </header>
            <div className="px-4 sm:px-6 md:px-12 pb-24">
                <div className="max-w-3xl xl:max-w-6xl mx-auto">
                    {/* Hero Section */}
                    <section id="hero-section" className="text-center my-10 md:my-16">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-700">Program Loyalitas Mitra Outlet</h2>
                        <p className="text-lg text-gray-500 mt-4 max-w-2xl mx-auto">
                            Bergabunglah dengan program loyalitas kami dan dapatkan poin dari setiap transaksi untuk ditukarkan dengan hadiah-hadiah menarik!
                        </p>
                        <div className="mt-8 flex flex-col items-center justify-center gap-2">
                            <button onClick={() => setCurrentPage('register')} className="neu-button text-red-600 !w-auto px-10 py-3">Daftar Sekarang</button>
                            <p className="text-xs text-gray-500">Khusus Outlet Digipos</p>
                        </div>
                    </section>
                </div>
                
                {/* Rewards Slider Section */}
                <section id="hadiah-section" className="my-12 md:my-20 overflow-hidden">
                    <div className="max-w-3xl xl:max-w-6xl mx-auto">
                        <h3 className="text-2xl md:text-3xl font-bold text-gray-700 text-center mb-10">Hadiah Eksklusif Menanti Anda</h3>
                    </div>
                    <div className="relative">
                        <div className="max-w-3xl xl:max-w-6xl mx-auto relative md:px-12">
                            <button onClick={() => handleNav('left', rewardsScrollContainer)} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 neu-button-icon !rounded-full !bg-[var(--base-bg)] p-3 hidden md:inline-flex" aria-label="Previous slide">
                                <Icon path={ICONS.chevronLeft} className="w-6 h-6"/>
                            </button>
                            <div ref={rewardsScrollContainer} className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                               {rewards.map((r) => (
                                    <div key={r.id} className="snap-center flex-shrink-0 w-10/12 sm:w-1/2 lg:w-1/3 p-4">
                                        <div className="neu-card overflow-hidden flex flex-col h-full">
                                            <img src={r.imageUrl} alt={r.name} className="w-full h-40 md:h-48 object-cover"/>
                                            <div className="p-6 flex flex-col flex-grow text-center">
                                                <h4 className="text-lg font-bold flex-grow text-gray-800 min-h-[56px]">{r.name}</h4>
                                                <p className="text-xl font-bold text-red-600 mt-2">{(r.points || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })} Poin</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => handleNav('right', rewardsScrollContainer)} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 neu-button-icon !rounded-full !bg-[var(--base-bg)] p-3 hidden md:inline-flex" aria-label="Next slide">
                               <Icon path={ICONS.chevronRight} className="w-6 h-6"/>
                            </button>
                        </div>
                    </div>
                     <p className="text-center mt-8 text-gray-600 max-w-3xl xl:max-w-6xl mx-auto">Dan masih banyak lagi hadiah lainnya!</p>
                </section>

                {/* Simulasi Poin Section */}
                <section id="kalkulator-section" className="my-12 md:my-20 max-w-3xl xl:max-w-6xl mx-auto">
                    <SimulasiPoin loyaltyPrograms={loyaltyPrograms} />
                </section>
                
                {/* Running Programs Section */}
                {runningPrograms.length > 0 && (
                    <section id="program-section" className="my-12 md:my-20 overflow-hidden">
                        <div className="max-w-3xl xl:max-w-6xl mx-auto">
                            <h3 className="text-2xl md:text-3xl font-bold text-gray-700 text-center mb-10">Program yang Sedang Berjalan</h3>
                        </div>
                        <div className="relative">
                            <div className="max-w-3xl xl:max-w-6xl mx-auto relative md:px-12">
                                <button onClick={() => handleNav('left', programsScrollContainer)} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 neu-button-icon !rounded-full !bg-[var(--base-bg)] p-3 hidden md:inline-flex" aria-label="Previous program">
                                    <Icon path={ICONS.chevronLeft} className="w-6 h-6"/>
                                </button>
                                <div ref={programsScrollContainer} className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                    {runningPrograms.map(p => (
                                        <div key={p.id} className="snap-center flex-shrink-0 w-10/12 sm:w-1/2 lg:w-1/3 p-4">
                                            <div className="neu-card overflow-hidden flex flex-col h-full">
                                                <img src={p.imageUrl} alt={p.name} className="w-full h-40 md:h-48 object-cover" />
                                                <div className="p-6 flex flex-col flex-grow text-center">
                                                    <h4 className="text-lg font-bold text-gray-800 flex-grow">{p.name}</h4>
                                                    <p className="text-sm text-gray-500 mt-2">{formatDateRange(p.startDate, p.endDate)}</p>
                                                    <div className="mt-3 bg-red-100 text-red-700 font-semibold py-2 px-4 rounded-lg">
                                                        Hadiah: {p.prizeDescription}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => handleNav('right', programsScrollContainer)} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 neu-button-icon !rounded-full !bg-[var(--base-bg)] p-3 hidden md:inline-flex" aria-label="Next program">
                                    <Icon path={ICONS.chevronRight} className="w-6 h-6"/>
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                {/* Winners Section */}
                <PemenangUndian winners={raffleWinners} />

                 {/* Footer Section */}
                <footer className="text-center py-10 border-t border-gray-200/80 mt-16">
                    <p className="text-gray-500">&copy; {new Date().getFullYear()} PT Agrabudi Komunika. All rights reserved.</p>
                     <div className="flex justify-center gap-4 mt-4">
                        <a href="#" className="text-gray-400 hover:text-red-500"><Icon path={ICONS.whatsapp} className="w-6 h-6"/></a>
                        <a href="#" className="text-gray-400 hover:text-red-500"><Icon path={ICONS.instagram} className="w-6 h-6"/></a>
                        <a href="#" className="text-gray-400 hover:text-red-500"><Icon path={ICONS.facebook} className="w-6 h-6"/></a>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default LandingPage;
