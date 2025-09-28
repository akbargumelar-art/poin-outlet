
import React from 'react';
import { User, Reward, RaffleProgram } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';

interface TukarPoinProps {
    currentUser: User;
    rewards: Reward[];
    handleTukarClick: (reward: Reward) => void;
    rafflePrograms: RaffleProgram[];
}

const TukarPoin: React.FC<TukarPoinProps> = ({ currentUser, rewards, handleTukarClick, rafflePrograms }) => {
    const userPoints = currentUser.points || 0;
    const kuponUndianReward = rewards.find(r => r.name.includes('Kupon Undian'));
    const otherRewards = rewards.filter(r => !r.name.includes('Kupon Undian'));
    const activeProgram = rafflePrograms.find(p => p.isActive);

    return (
         <div className="relative">
            <div className="sticky top-0 bg-neutral-100/80 backdrop-blur-md z-10 py-4 -my-4 -mx-6 px-6 mb-2">
                 <h1 className="text-3xl font-bold text-gray-700">Katalog Hadiah</h1>
                 <p className="text-lg text-gray-600">Poin Anda: <span className="font-bold text-red-600">{userPoints.toLocaleString('id-ID')}</span> | Kupon: <span className="font-bold text-purple-600">{currentUser.kuponUndian || 0}</span></p>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-8">
                {otherRewards.map(r => {
                    const isOutOfStock = r.stock === 0;
                    const canRedeem = userPoints >= r.points && !isOutOfStock;
                    return (
                        <div key={r.id} className={`neu-card overflow-hidden flex flex-col transition-opacity ${isOutOfStock ? 'opacity-60' : ''}`}>
                            <div className="relative">
                                <img src={r.image} alt={r.name} className={`w-full h-48 object-cover ${isOutOfStock ? 'filter grayscale' : ''}`}/>
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