import React from 'react';
import { User, Reward, RaffleProgram, LoyaltyProgram } from '../../types';

interface TukarPoinProps {
    currentUser: User;
    rewards: Reward[];
    handleTukarClick: (reward: Reward) => void;
    rafflePrograms: RaffleProgram[];
    loyaltyPrograms: LoyaltyProgram[];
}

const TukarPoin: React.FC<TukarPoinProps> = ({ currentUser, rewards, handleTukarClick, rafflePrograms, loyaltyPrograms }) => {
    const userPoints = currentUser.points || 0;
    const kuponUndianReward = rewards.find(r => r.name.includes('Kupon Undian'));
    const otherRewards = rewards.filter(r => !r.name.includes('Kupon Undian'));
    const activeProgram = rafflePrograms.find(p => p.isActive);

    const levelColors: { [key: string]: { text: string, bg: string } } = {
        Bronze: { text: 'text-amber-800', bg: 'bg-amber-100' },
        Silver: { text: 'text-slate-800', bg: 'bg-slate-200' },
        Gold: { text: 'text-yellow-800', bg: 'bg-yellow-100' },
        Platinum: { text: 'text-cyan-800', bg: 'bg-cyan-100' },
    };

    const levelCardStyles: { [key: string]: string } = {
        Bronze: 'border-amber-600',
        Silver: 'border-slate-500',
        Gold: 'border-yellow-500',
        Platinum: 'border-cyan-500',
    };

    return (
         <div className="relative">
            <div className="sticky top-0 bg-neutral-100/80 backdrop-blur-md z-10 py-4 -my-4 -mx-6 px-6 mb-2">
                 <h1 className="text-2xl md:text-3xl font-bold text-gray-700">Katalog Hadiah</h1>
                 <p className="text-lg text-gray-600">Poin Anda: <span className="font-bold text-red-600">{userPoints.toLocaleString('id-ID')}</span> | Kupon: <span className="font-bold text-purple-600">{currentUser.kuponUndian || 0}</span></p>
            </div>

             <div className="my-8">
                <h2 className="text-2xl font-bold text-gray-700 mb-4">Level Loyalitas Anda</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {loyaltyPrograms.map(p => {
                        const isCurrentLevel = currentUser.level === p.level;
                        return (
                            <div key={p.level} className={`neu-card p-3 text-center transition-all duration-200 border-b-4 ${isCurrentLevel ? levelCardStyles[p.level] : 'border-transparent'}`}>
                                <h2 className={`text-lg font-bold ${isCurrentLevel ? levelColors[p.level]?.text : 'text-gray-800'}`}>{p.level}</h2>
                                <p className="text-gray-500 mt-1 text-xs px-2 min-h-[40px] flex items-center justify-center">Tingkatkan terus Pembelian dan Transaksi DigiPos Anda untuk Naik Level</p>
                                {isCurrentLevel && <div className={`mt-2 ${levelColors[p.level]?.bg} ${levelColors[p.level]?.text} text-xs font-bold text-center py-1 px-2 rounded-full`}>LEVEL ANDA</div>}
                            </div>
                        )
                    })}
                </div>
            </div>

            {kuponUndianReward && (
                <div className="neu-card p-6 my-8 bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-bold">Tukar Poin Jadi Kesempatan!</h2>
                        {activeProgram ? (
                            <p className="opacity-80 mt-1">Dapatkan kupon undian & menangkan <b>{activeProgram.prize}</b>! Program: <b>{activeProgram.name}</b> ({activeProgram.period}).</p>
                        ) : (
                             <p className="opacity-80 mt-1">Dapatkan kupon undian dan menangkan hadiah utama di akhir periode!</p>
                        )}
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold">{kuponUndianReward.points} Poin</p>
                        <button 
                            onClick={() => handleTukarClick(kuponUndianReward)} 
                            disabled={userPoints < kuponUndianReward.points || !activeProgram}
                            className="mt-2 w-full neu-button !bg-white !text-purple-600 disabled:!bg-white/50 disabled:!text-purple-400"
                        >
                            {activeProgram ? 'Tukar 1 Kupon' : 'Program Tidak Aktif'}
                        </button>
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-8">
                {otherRewards.map(r => {
                    const isOutOfStock = r.stock === 0;
                    const canRedeem = userPoints >= r.points && !isOutOfStock;
                    return (
                        <div key={r.id} className={`neu-card overflow-hidden flex flex-col transition-opacity ${isOutOfStock ? 'opacity-60' : ''}`}>
                            <div className="relative">
                                <img src={r.imageUrl} alt={r.name} className={`w-full h-56 object-cover ${isOutOfStock ? 'filter grayscale' : ''}`}/>
                                {isOutOfStock && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white font-bold text-lg bg-red-600 px-3 py-1 rounded-md">STOK HABIS</span></div>}
                            </div>
                            <div className="p-4 flex flex-col flex-grow">
                                <h3 className="text-lg font-bold flex-grow">{r.name}</h3>
                                <div className="flex justify-between items-center">
                                    <p className="text-xl font-bold text-red-600 my-2">{r.points.toLocaleString('id-ID')} Poin</p>
                                    <p className="text-sm font-semibold text-gray-500">Stok: {r.stock}</p>
                                </div>
                                <button 
                                    onClick={() => handleTukarClick(r)} 
                                    disabled={!canRedeem} 
                                    className={`w-full mt-2 neu-button ${canRedeem ? 'text-red-600' : 'text-gray-400'}`}
                                >
                                    {isOutOfStock ? 'Stok Habis' : 'Tukar'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TukarPoin;