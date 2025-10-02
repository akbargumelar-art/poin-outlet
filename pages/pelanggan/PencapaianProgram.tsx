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
    
    const formatDateRange = (start: string, end: string) => {
        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
        const startDate = new Date(start).toLocaleDateString('id-ID', options);
        const endDate = new Date(end).toLocaleDateString('id-ID', options);
        return `${startDate} - ${endDate}`;
    };


    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-700 mb-6">Pencapaian Program</h1>
            
            <h2 className="text-2xl font-bold text-gray-700 my-8">Program Sedang Berjalan</h2>
            <div className="space-y-6">
                {runningPrograms.map(p => (
                    <div key={p.id} className="neu-card overflow-hidden flex flex-col md:flex-row">
                        <img src={p.imageUrl} alt={p.name} className="w-full md:w-48 h-64 md:h-auto object-cover"/>
                        <div className="p-6 flex flex-col flex-grow">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">{p.name}</h3>
                                    <p className="text-sm text-gray-500 bg-slate-200/50 inline-block px-2 py-1 rounded-md mt-1">{formatDateRange(p.startDate, p.endDate)}</p>
                                </div>
                                <div className="text-right flex-shrink-0 ml-4">
                                    <p className="font-semibold text-gray-600">Hadiah Utama</p>
                                    <p className="text-lg font-bold text-red-600">{p.prize}</p>
                                </div>
                            </div>
                            <p className="text-gray-700 mt-4 flex-grow">{p.mechanism}</p>
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
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PencapaianProgram;
