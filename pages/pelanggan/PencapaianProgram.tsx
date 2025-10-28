import React from 'react';
import { User, LoyaltyProgram, RunningProgram } from '../../types';

interface PencapaianProgramProps {
    currentUser: User;
    loyaltyPrograms: LoyaltyProgram[];
    runningPrograms: RunningProgram[];
}

const PencapaianProgram: React.FC<PencapaianProgramProps> = ({ currentUser, loyaltyPrograms, runningPrograms }) => {
    
    const formatDateRange = (start: string, end: string) => {
        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
        const startDate = new Date(start).toLocaleDateString('id-ID', options);
        const endDate = new Date(end).toLocaleDateString('id-ID', options);
        return `${startDate} - ${endDate}`;
    };

    const getEstimatedPrize = (program: RunningProgram, progress: number): string | null => {
        if (program.prizeCategory === 'Uang Tunai' || program.prizeCategory === 'Saldo') {
            const prizeValue = parseInt(program.prizeDescription.replace(/[^0-9]/g, ''), 10);
            if (!isNaN(prizeValue)) {
                const estimatedValue = Math.floor((progress / 100) * prizeValue);
                return `Estimasi hadiah Anda saat ini: Rp ${estimatedValue.toLocaleString('id-ID', { maximumFractionDigits: 2 })}`;
            }
        }
        return null;
    };

    return (
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-700 mb-8">Pencapaian Program</h1>
            
            <div className="space-y-8">
                {runningPrograms.map(p => {
                    const userProgress = p.targets.find(t => t.userId === currentUser.id)?.progress || 0;
                    const estimatedPrize = getEstimatedPrize(p, userProgress);
                    return (
                        <div key={p.id} className="neu-card overflow-hidden flex flex-col md:flex-row">
                            <img src={p.imageUrl} alt={p.name} className="w-full md:w-52 h-64 md:h-auto object-cover"/>
                            <div className="p-6 flex flex-col flex-grow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800">{p.name}</h3>
                                        <p className="text-sm text-gray-500 bg-slate-200/50 inline-block px-2 py-1 rounded-md mt-1">{formatDateRange(p.startDate, p.endDate)}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-4">
                                        <p className="text-sm font-semibold text-gray-600">{p.prizeCategory}</p>
                                        <p className="text-lg font-bold text-red-600">{p.prizeDescription}</p>
                                    </div>
                                </div>
                                <p className="text-gray-700 mt-4 flex-grow">{p.mechanism}</p>
                                <div className="mt-4">
                                    <h4 className="font-semibold text-gray-700">Progres Anda:</h4>
                                    <div className="w-full rounded-full h-6 mt-2 neu-inset p-1">
                                        <div 
                                            className="bg-gradient-to-r from-yellow-400 to-red-500 h-full rounded-full text-center text-white text-sm font-bold flex items-center justify-center" 
                                            style={{width: `${userProgress}%`}}
                                        >
                                            {userProgress}%
                                        </div>
                                    </div>
                                    {estimatedPrize && <p className="text-sm text-right mt-1 text-green-600 font-semibold">{estimatedPrize}</p>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PencapaianProgram;