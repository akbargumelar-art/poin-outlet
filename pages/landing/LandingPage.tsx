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

    const handleNav = (direction: 'left' | 'right', container: 'rewards' | 'programs') => {
        const targetContainer = container === 'rewards' ? rewardsScrollContainer.current : programsScrollContainer.current;
        if (targetContainer) {
            const scrollAmount = targetContainer.offsetWidth * 0.8;
            targetContainer.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth',
            });
        }
    };
    
    const formatDateRange = (start: string, end: string) => {
        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
        const startDate = new Date(start).toLocaleDateString('id-ID', options);
        const endDate = new Date(end).toLocaleDateString('id-ID', options);
        return `${startDate} - ${endDate}`;
    };

    return (
        <div className="min-h-screen neu-bg font-sans animate-fade-in-down">
            {/* Header */}
            <header className="sticky top-0 z-30 p-4 md:p-6 flex justify-between items-center neu-bg shadow-sm">
                <img src="/logo.png" alt="Logo Agrabudi Komunika" className="h-8 sm:h-10" />
                <div className="flex items-center gap-4">
                    <button onClick={() => setCurrentPage('login')} className="neu-button !w-auto px-6 py-2 text-sm">Login</button>
                </div>
            </header>

            <main className="p-4 sm:p-6 md:p-12">
                {/* Hero Section */}
                <section className="text-center my-10 md:my-16">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-700">Program Loyalitas Mitra Outlet</h2>
                    <p className="text-lg text-gray-500 mt-4 max-w-2xl mx-auto">
                        Bergabunglah dengan program loyalitas kami dan dapatkan poin dari setiap transaksi untuk ditukarkan dengan hadiah-hadiah menarik!
                    </p>
                    <div className="mt-8 flex flex-col items-center justify-center gap-2">
                        <button onClick={() => setCurrentPage('register')} className="neu-button text-red-600 !w-auto px-10 py-3">Daftar Sekarang</button>
                        <p className="text-xs text-gray-500">Khusus Outlet Digipos</p>
                    </div>
                </section>
                
                {/* Rewards Slider Section */}
                <section className="my-12 md:my-20 overflow-hidden">
                    <h3 className="text-3xl font-bold text-gray-700 text-center mb-10">Hadiah Eksklusif Menanti Anda</h3>
                    <div className="relative max-w-6xl mx-auto md:px-12">
                        <button onClick={() => handleNav('left', 'rewards')} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 neu-button-icon !rounded-full !bg-[var(--base-bg)] p-3 hidden md:inline-flex" aria-label="Previous slide">
                            <Icon path={ICONS.chevronLeft} className="w-6 h-6"/>
                        </button>
                        <div ref={rewardsScrollContainer} className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                           {rewards.map((r) => (
                                <div key={r.id} className="snap-center flex-shrink-0 w-10/12 md:w-1/3 lg:w-1/4 p-4">
                                    <div className="neu-card overflow-hidden flex flex-col h-full">
                                        <img src={r.imageUrl} alt={r.name} className="w-full h-48 object-cover"/>
                                        <div className="p-6 flex flex-col flex-grow text-center">
                                            <h4 className="text-lg font-bold flex-grow text-gray-800 min-h-[56px]">{r.name}</h4>
                                            <p className="text-xl font-bold text-red-600 mt-2">{r.points.toLocaleString('id-ID')} Poin</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => handleNav('right', 'rewards')} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 neu-button-icon !rounded-full !bg-[var(--base-bg)] p-3 hidden md:inline-flex" aria-label="Next slide">
                           <Icon path={ICONS.chevronRight} className="w-6 h-6"/>
                        </button>
                    </div>
                     <p className="text-center mt-8 text-gray-600">Dan masih banyak lagi hadiah lainnya!</p>
                </section>

                {/* Simulasi Poin Section */}
                <section className="my-12 md:my-20 max-w-6xl mx-auto">
                    <SimulasiPoin loyaltyPrograms={loyaltyPrograms} />
                </section>

                {/* Running Program Section */}
                {runningPrograms && runningPrograms.length > 0 && (
                    <section className="my-12 md:my-20 overflow-hidden">
                        <h3 className="text-3xl font-bold text-gray-700 text-center mb-10">Program Berjalan</h3>
                         <div className="relative max-w-6xl mx-auto md:px-12">
                            <button onClick={() => handleNav('left', 'programs')} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 neu-button-icon !rounded-full !bg-[var(--base-bg)] p-3 hidden md:inline-flex" aria-label="Previous program">
                                <Icon path={ICONS.chevronLeft} className="w-6 h-6"/>
                            </button>
                            <div ref={programsScrollContainer} className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                               {runningPrograms.map((p) => (
                                    <div key={p.id} className="snap-center flex-shrink-0 w-10/12 md:w-1/3 lg:w-1/4 p-4">
                                        <div className="neu-card overflow-hidden flex flex-col h-full">
                                            <img src={p.imageUrl} alt={p.name} className="w-full h-48 object-cover" />
                                            <div className="p-6 flex flex-col flex-grow text-center">
                                                <h4 className="text-xl font-bold text-gray-800">{p.name}</h4>
                                                <p className="text-sm text-gray-500 mb-2">{formatDateRange(p.startDate, p.endDate)}</p>
                                                <p className="text-gray-600 flex-grow min-h-[70px]">{p.mechanism}</p>
                                                <div className="mt-6">
                                                    <p className="font-semibold text-gray-500 text-sm">Raih Hadiah Utama</p>
                                                    <p className="text-xl font-bold text-red-600 my-1">{p.prize}</p>
                                                </div>
                                            </div>
                                            <div className="p-4 pt-0">
                                                <button onClick={() => setCurrentPage('register')} className="neu-button !text-sm text-red-600">
                                                    Ikuti Program
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                             <button onClick={() => handleNav('right', 'programs')} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 neu-button-icon !rounded-full !bg-[var(--base-bg)] p-3 hidden md:inline-flex" aria-label="Next program">
                               <Icon path={ICONS.chevronRight} className="w-6 h-6"/>
                            </button>
                        </div>
                    </section>
                )}

                <PemenangUndian winners={raffleWinners} />

                {/* About Section */}
                <section className="my-12 md:my-20 max-w-5xl mx-auto">
                     <h3 className="text-3xl font-bold text-gray-700 text-center mb-10">Tentang Kami</h3>
                     <div className="neu-card p-8 md:p-10">
                        <h4 className="text-2xl font-bold text-red-600">PT Agrabudi Komunika</h4>
                        <p className="mt-4 text-gray-600">
                           PT Agrabudi Komunika merupakan Strategic Business Partner Telkomsel (Telkomsel Authorized Partner). Sebagai mitra outlet resmi, kami berkomitmen untuk memberikan layanan dan program terbaik bagi para mitra kami. Program Loyalitas ini adalah bentuk apresiasi kami atas kerja sama dan pencapaian Anda.
                        </p>
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h5 className="font-bold text-gray-700 flex items-center gap-2"><Icon path={ICONS.location} className="w-5 h-5"/>Kantor Cirebon</h5>
                                <p className="text-gray-600 mt-1 pl-7">Jl. Pemuda Raya No.21B, Sunyaragi, Kec. Kesambi, Kota Cirebon, Jawa Barat 45132</p>
                                <div className="mt-4 rounded-lg overflow-hidden neu-inset"><iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3962.33602167812!2d108.5305983153673!3d-6.729125995135111!2m3!1f0!2f0!3f0!3m2!i1024!i768!4f13.1!3m3!1m2!1s0x2e6f1d88a1b5731b%3A0x622cde8718e00318!2sPT.%20Agrabudi%20Komunika!5e0!3m2!1sen!2sid!4v1662524312891!5m2!1sen!2sid" width="100%" height="200" style={{border:0}} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe></div>
                            </div>
                            <div>
                                <h5 className="font-bold text-gray-700 flex items-center gap-2"><Icon path={ICONS.location} className="w-5 h-5"/>Kantor Kuningan</h5>
                                <p className="text-gray-600 mt-1 pl-7">Jl. Siliwangi No.45, Purwawinangun, Kec. Kuningan, Kabupaten Kuningan, Jawa Barat 45512</p>
                                <div className="mt-4 rounded-lg overflow-hidden neu-inset"><iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.916823521369!2d108.4811198153683!3d-6.90028349501348!2m3!1f0!2f0!3f0!3m2!i1024!i768!4f13.1!3m3!1m2!1s0x2e6f173775b69a6b%3A0x86842586b0a17349!2sAgrabudi%20Komunika!5e0!3m2!1sen!2sid!4v1662524412803!5m2!1sen!2sid" width="100%" height="200" style={{border:0}} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe></div>
                            </div>
                        </div>
                     </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="neu-card-flat rounded-t-2xl mt-12 p-8 text-center">
                <p className="font-bold text-gray-700">Hubungi Kami</p>
                <div className="flex justify-center gap-6 my-4">
                    <a href="https://instagram.com/agrabudikomunika" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-red-600"><Icon path={ICONS.instagram} className="w-8 h-8"/></a>
                    <a href="https://tsel.id/fbciraya" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-red-600"><Icon path={ICONS.facebook} className="w-8 h-8"/></a>
                    <a href="https://wa.me/6285168822280" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-red-600"><Icon path={ICONS.whatsapp} className="w-8 h-8"/></a>
                </div>
                <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} PT Agrabudi Komunika. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LandingPage;