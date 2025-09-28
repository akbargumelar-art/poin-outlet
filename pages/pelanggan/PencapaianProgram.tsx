
import React from 'react';
import { User, LoyaltyProgram, RunningProgram } from '../../types';

interface PencapaianProgramProps {
    currentUser: User;
    loyaltyPrograms: LoyaltyProgram[];
    runningPrograms: RunningProgram[];
}

const PencapaianProgram: React.FC<PencapaianProgramProps> = ({ currentUser, loyaltyPrograms, runningPrograms }) => {
    const userProgress = (programId: number) => {
        const program = runningPrograms.find(p => p.id === programId);
        const target = program?.targets.find(t => t.userId === currentUser.id);
        return target ? target.progress : 0;
    }

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
        <div>
            <h1 className="text-3xl font-bold text-gray-700 mb-6">Pencapaian Program</h1>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {loyaltyPrograms.map(p => {
                    const isCurrentLevel = currentUser.level === p.level;
                    return (
                        <div key={p.level} className={`neu-card p-3 text-center transition-all duration-200 border-b-4 ${isCurrentLevel ? levelCardStyles[p.level] : 'border-transparent'}`}>
                             <h2 className={`text-lg font-bold ${isCurrentLevel ? levelColors[p.level]?.text : 'text-gray-800'}`}>{p.level}</h2>
                            <p className="text-gray-500 mt-1 text-xs">Min. {p.pointsNeeded.toLocaleString('id-ID')} Poin</p>
                             {isCurrentLevel && <div className={`mt-2 ${levelColors[p.level]?.bg} ${levelColors[p.level]?.text} text-xs font-bold text-center py-1 px-2 rounded-full`}>LEVEL ANDA</div>}
                        </div>
                    )
                })}
            </div>

            <h2 className="text-2xl font-bold text-gray-700 my-8">Program Sedang Berjalan</h2>
            <div className="space-y-6">
                {runningPrograms.map(p => (
                    <div key={p.id} className="neu-card p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">{p.name}</h3>
                                <p className="text-sm text-gray-500 bg-slate-200/50 inline-block px-2 py-1 rounded-md mt-1">{p.period}</p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                                <p className="font-semibold text-gray-600">Hadiah Utama</p>
                                <p className="text-lg font-bold text-red-600">{p.prize}</p>
                            </div>
                        </div>
                        <p className="text-gray-700 mt-4">{p.mechanism}</p>
                        <div className="mt-4">
                            <h4 className="font-semibold text-gray-700">Progres Anda:</h4>
                            <div className="w-full rounded-full h-6 mt-2 neu-inset p-1">
                                <div 
                                    className="bg-gradient-to-r from-yellow-400 to-red-500 h-full rounded-full text-center text-white text-sm font-bold flex items-center justify-center" 
                                    style={{width: `${userProgress(p.id)}%`}}
                                >
                                    {userProgress(p.id)}%
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PencapaianProgram;