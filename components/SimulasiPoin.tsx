import React, { useState, useMemo } from 'react';
import { User, LoyaltyProgram } from '../types';
import Icon from './common/Icon';
import { ICONS } from '../constants';

interface SimulasiPoinProps {
    loyaltyPrograms: LoyaltyProgram[];
    currentUser?: User | null; // Optional: if provided, uses user's level
}

const SimulasiPoin: React.FC<SimulasiPoinProps> = ({ loyaltyPrograms, currentUser }) => {
    const [purchaseAmount, setPurchaseAmount] = useState(0);
    // Default to Bronze for landing/admin pages
    const [selectedLevel, setSelectedLevel] = useState('Bronze');

    const isPartnerDashboard = currentUser?.role === 'pelanggan';

    const { points, level, multiplier } = useMemo(() => {
        const levelToUse = isPartnerDashboard ? currentUser.level : selectedLevel;
        
        const programForLevel = loyaltyPrograms.find(p => p.level === levelToUse) || loyaltyPrograms.find(p => p.level === 'Bronze');
        
        const currentMultiplier = programForLevel?.multiplier || 1;
        const currentLevel = programForLevel?.level || 'Bronze';
        
        const calculatedPoints = purchaseAmount > 0 ? Math.floor((purchaseAmount / 1000) * currentMultiplier) : 0;
        
        return {
            points: calculatedPoints,
            level: currentLevel,
            multiplier: currentMultiplier
        };
    }, [purchaseAmount, currentUser, loyaltyPrograms, selectedLevel, isPartnerDashboard]);
    
    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0;
        setPurchaseAmount(value);
    };

    return (
        <div className="neu-card p-6">
            <h3 className="text-xl font-bold text-gray-700 flex items-center gap-3">
                <Icon path={ICONS.calculator} className="w-6 h-6 text-red-500" />
                Kalkulator Poin
            </h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">
                Hitung potensi poin yang akan Anda dapatkan dari total belanja.
            </p>
            
            {!isPartnerDashboard && (
                <div className="mb-4">
                    <label className="block text-gray-600 text-sm font-semibold mb-2">Pilih Level Mitra untuk Simulasi</label>
                    <select
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        className="input-field"
                    >
                        {loyaltyPrograms.map(p => (
                            <option key={p.level} value={p.level}>{p.level}</option>
                        ))}
                    </select>
                </div>
            )}
            
            <div className="relative">
                 <span className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400 font-semibold">Rp</span>
                <input 
                    type="text" 
                    value={purchaseAmount > 0 ? purchaseAmount.toLocaleString('id-ID') : ''}
                    onChange={handleAmountChange}
                    placeholder="Masukkan Total Belanja"
                    className="input-field pl-10 text-lg"
                />
            </div>
            <div className="neu-inset p-4 mt-4 text-center">
                <p className="text-gray-600">Potensi Poin Didapat</p>
                <p className="text-4xl font-bold text-green-600 my-2">{points.toLocaleString('id-ID')}</p>
                 {isPartnerDashboard ? (
                     <p className="text-xs text-gray-500">
                         Berdasarkan level Anda saat ini: <span className="font-semibold">{level} ({multiplier}x)</span>
                     </p>
                 ) : (
                      <p className="text-xs text-gray-500">
                         Perhitungan berdasarkan level simulasi: <span className="font-semibold">{level} ({multiplier}x)</span>
                     </p>
                 )}
            </div>
        </div>
    );
};

export default SimulasiPoin;