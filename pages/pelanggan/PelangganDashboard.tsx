import React from 'react';
import { User, Transaction, LoyaltyProgram, RunningProgram, Page, RaffleWinner } from '../../types';
import PemenangUndian from '../../components/PemenangUndian';
import SimulasiPoin from '../../components/SimulasiPoin';

interface PelangganDashboardProps {
    currentUser: User;
    transactions: Transaction[];
    loyaltyPrograms: LoyaltyProgram[];
    runningPrograms: RunningProgram[];
    setCurrentPage: (page: Page) => void;
    raffleWinners: RaffleWinner[];
}

const PelangganDashboard: React.FC<PelangganDashboardProps> = ({ currentUser, transactions, loyaltyPrograms, runningPrograms, setCurrentPage, raffleWinners }) => {
    const userTransactions = transactions.filter(t => t.userId === currentUser.id);
    const recentTransaction = [...userTransactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const nextLevel = loyaltyPrograms.find(p => p.pointsNeeded > (currentUser.points || 0));
    const progress = nextLevel ? Math.round(((currentUser.points || 0) / nextLevel.pointsNeeded) * 100) : 100;
    
    const displayedPrograms = runningPrograms.slice(0, 3);

    const levelColors: { [key: string]: string } = {
        Bronze: 'from-amber-500 to-amber-700',
        Silver: 'from-slate-400 to-slate-600',
        Gold: 'from-yellow-400 to-yellow-600',
        Platinum: 'from-cyan-400 to-cyan-600',
    };
    const currentLevelGradient = levelColors[currentUser.level || 'Bronze'] || 'from-red-500 to-red-700';

    const formatDateRange = (start: string, end: string) => {
        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
        const startDate = new Date(start).toLocaleDateString('id-ID', options);
        const endDate = new Date(end).toLocaleDateString('id-ID', options);
        return `${startDate} - ${endDate}`;
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-700">Selamat Datang Kembali,</h1>
                <p className="text-lg md:text-xl text-red-600 font-semibold">{currentUser.profile.nama}!</p>
            </div>

            <div className={`neu-card bg-gradient-to-br ${currentLevelGradient} text-white p-6`}>
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-md font-semibold opacity-80">Total Poin Anda</h2>
                        <p className="text-4xl md:text-5xl font-bold">{(currentUser.points || 0).toLocaleString('id-ID')}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-md font-semibold opacity-80">Kupon Undian</h2>
                        <p className="text-4xl md:text-5xl font-bold">{(currentUser.kuponUndian || 0)}</p>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/20">
                     <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-md font-semibold opacity-90">Level Loyalti</h2>
                            <p className="text-xl md:text-2xl font-bold">{currentUser.level}</p>
                        </div>
                         <button 
                            onClick={() => setCurrentPage('tukarPoin')} 
                            className="px-6 py-2 bg-white/20 rounded-full text-white font-semibold hover:bg-white/30 transition-colors"
                        >
                            Tukar Poin
                        </button>
                     </div>
                     {nextLevel && (
                        <>
                            <div className="w-full rounded-full h-2 mt-3 bg-white/20">
                                <div className="bg-white h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                            </div>
                            <p className="text-xs opacity-90 mt-1 text-right">{nextLevel.pointsNeeded - (currentUser.points || 0)} poin lagi ke {nextLevel.level}</p>
                        </>
                    )}
                </div>
            </div>

            {/* Kalkulator Poin */}
            <SimulasiPoin loyaltyPrograms={loyaltyPrograms} currentUser={currentUser} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="neu-card p-4">
                    <h2 className="text-md font-semibold text-gray-600">Transaksi Terakhir</h2>
                    {recentTransaction ? (
                        <>
                            <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">Rp {recentTransaction.totalPembelian.toLocaleString('id-ID')}</p>
                             <p className="text-sm font-semibold text-gray-700 truncate">{recentTransaction.produk}</p>
                            <div className="flex justify-between items-center mt-1">
                                <p className="text-xs text-gray-500">{new Date(recentTransaction.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                <p className="text-sm font-bold text-green-600">+ {recentTransaction.pointsEarned} Poin</p>
                            </div>
                        </>
                    ) : (
                        <p className="mt-4 text-gray-500">Belum ada transaksi.</p>
                    )}
                </div>
                 <div className="neu-card p-4 flex flex-col justify-center items-center text-center">
                    <h2 className="text-md font-semibold text-gray-600">Lihat Semua Riwayat</h2>
                    <p className="text-sm text-gray-500 my-2">Cek riwayat pembelian dan penukaran poin Anda.</p>
                    <button onClick={() => setCurrentPage('historyPembelian')} className="neu-button !w-auto px-6">Buka Riwayat</button>
                </div>
            </div>

            {displayedPrograms.length > 0 && (
                <div className="neu-card p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-700">Program Sedang Berjalan</h2>
                        <button onClick={() => setCurrentPage('pencapaianProgram')} className="text-sm font-semibold text-red-600">Lihat Semua</button>
                    </div>
                    <div className="space-y-6">
                        {displayedPrograms.map(program => {
                            const userProgress = program.targets.find(t => t.userId === currentUser.id)?.progress || 0;
                            return (
                                <div key={program.id} className="border-t border-gray-200/80 pt-4 first:pt-0 first:border-none">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800">{program.name}</h3>
                                            <p className="text-xs text-gray-500">{formatDateRange(program.startDate, program.endDate)}</p>
                                        </div>
                                        <p className="text-sm text-right text-red-500 font-semibold flex-shrink-0 ml-2">{program.prize}</p>
                                    </div>
                                    <div className="mt-2">
                                        <div className="w-full rounded-full h-6 neu-inset p-1">
                                            <div className="bg-gradient-to-r from-yellow-400 to-red-500 h-full rounded-full flex items-center justify-center text-white text-sm font-bold" style={{width: `${userProgress}%`}}>
                                                {userProgress}%
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            <PemenangUndian winners={raffleWinners} />
        </div>
    );
};

export default PelangganDashboard;