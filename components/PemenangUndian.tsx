import React from 'react';
import { RaffleWinner } from '../../types';

interface PemenangUndianProps {
    winners: RaffleWinner[];
}

const PemenangUndian: React.FC<PemenangUndianProps> = ({ winners }) => {
    if (!winners || winners.length === 0) {
        return null;
    }

    return (
        <section className="my-16 md:my-20 max-w-6xl mx-auto">
            <h3 className="text-3xl font-bold text-gray-700 text-center mb-10">Dokumentasi Pemenang Undian</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {winners.map((winner) => (
                    <div key={winner.id} className="neu-card p-4 text-center animate-fade-in-up">
                        <div className="w-24 h-24 rounded-full mx-auto neu-inset p-1 overflow-hidden mb-4">
                            <img src={winner.photoUrl} alt={winner.name} className="w-full h-full object-cover rounded-full" />
                        </div>
                        <h4 className="text-xl font-bold text-gray-800">{winner.name}</h4>
                        <p className="text-sm text-gray-500">Pemenang Undian Periode {winner.period}</p>
                        <div className="mt-3 bg-red-100 text-red-700 font-semibold py-2 px-4 rounded-lg">
                            Hadiah: {winner.prize}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default PemenangUndian;
