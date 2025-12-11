
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Redemption } from '../../types';
import Icon from './Icon';
import { ICONS } from '../../constants';

interface DocumentationSliderProps {
    redemptions: Redemption[];
}

const DocumentationSlider: React.FC<DocumentationSliderProps> = ({ redemptions }) => {
    // 1. Filter: Hanya tampilkan yang statusnya 'Selesai' DAN punya URL foto
    const validItems = useMemo(() => 
        redemptions.filter(r => r.status === 'Selesai' && r.documentationPhotoUrl),
    [redemptions]);

    // 2. Group items into pairs (chunks of 2)
    const itemChunks = useMemo(() => {
        const chunks = [];
        for (let i = 0; i < validItems.length; i += 2) {
            chunks.push(validItems.slice(i, i + 2));
        }
        return chunks;
    }, [validItems]);
    
    const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Kecepatan slider (ms).
    const AUTO_SLIDE_INTERVAL = 2500; // 2.5 detik

    const resetTimeout = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    };

    // Fungsi untuk memilih slide berikutnya secara acak
    const nextSlide = () => {
        if (itemChunks.length <= 1) return;

        let newIndex;
        // Pastikan index baru tidak sama dengan index sekarang agar transisi terlihat
        do {
            newIndex = Math.floor(Math.random() * itemChunks.length);
        } while (newIndex === currentChunkIndex);

        setCurrentChunkIndex(newIndex);
    };

    const prevSlide = () => {
        nextSlide(); 
    };

    useEffect(() => {
        resetTimeout();
        // Hanya jalankan auto-slide jika tidak sedang dipause
        if (itemChunks.length > 0 && !isPaused) {
            timeoutRef.current = setTimeout(() => {
                nextSlide();
            }, AUTO_SLIDE_INTERVAL);
        }

        return () => resetTimeout();
    }, [currentChunkIndex, itemChunks.length, isPaused]);

    // Jika tidak ada data, jangan render apapun
    if (itemChunks.length === 0) return null;

    const currentGroup = itemChunks[currentChunkIndex];

    return (
        <div className="w-full max-w-6xl mx-auto my-8 md:my-12 px-4">
             <div className="text-center mb-6">
                <h3 className="text-xl md:text-2xl font-bold text-gray-700">Bukti Penyerahan Hadiah</h3>
                <p className="text-gray-500 text-xs mt-1">Dokumentasi asli penyerahan reward kepada Mitra Outlet setia kami.</p>
             </div>
             
             {/* Main Card Container */}
             <div 
                className="neu-card relative overflow-hidden bg-white/60 backdrop-blur-md transition-all duration-300 hover:shadow-xl"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
             >
                {/* 
                    Grid Layout:
                    Mobile: 1 col (stacked) but constrained height to show both small or scroll? 
                    Actually better to show 2 cols on mobile too if items are small, OR stack them vertically.
                    Here we use grid-cols-1 for mobile (stacked) and grid-cols-2 for desktop.
                    Fixed height ensures stability.
                */}
                <div className="grid grid-cols-1 md:grid-cols-2 h-[600px] md:h-[350px] divide-y md:divide-y-0 md:divide-x divide-gray-200">
                    
                    {currentGroup.map((item, index) => (
                        <div key={item.id || index} className="relative w-full h-full p-4 flex flex-col items-center justify-center group">
                            {/* Image Area */}
                            <div className="relative w-full h-48 md:h-56 mb-3 neu-inset p-2 rounded-xl overflow-hidden">
                                <img 
                                    src={item.documentationPhotoUrl} 
                                    alt={item.rewardName} 
                                    className="w-full h-full object-cover rounded-lg shadow-sm transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute top-3 right-3 bg-green-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md">
                                    Terverifikasi
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="w-full text-center px-2">
                                <h4 className="text-sm md:text-base font-extrabold text-red-600 line-clamp-1" title={item.rewardName}>
                                    {item.rewardName}
                                </h4>
                                <div className="flex items-center justify-center gap-2 mt-1">
                                    <div className="flex items-center gap-1">
                                        <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-[8px]">
                                            {item.userName ? item.userName.charAt(0) : 'M'}
                                        </div>
                                        <p className="text-xs font-bold text-gray-700 line-clamp-1">{item.userName}</p>
                                    </div>
                                    <span className="text-[10px] text-gray-400">•</span>
                                    <p className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-semibold truncate max-w-[100px]">
                                        {item.userTap || 'TAP Area'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Placeholder if chunk has only 1 item */}
                    {currentGroup.length === 1 && (
                        <div className="hidden md:flex w-full h-full items-center justify-center bg-gray-50/50 p-4">
                            <div className="text-center text-gray-400">
                                <Icon path={ICONS.gift} className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p className="text-sm font-semibold opacity-50">Lebih banyak hadiah menanti!</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation Arrows */}
                <button 
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg opacity-0 hover:opacity-100 transition-opacity md:opacity-0 opacity-100 z-20"
                    onClick={prevSlide}
                    aria-label="Previous Slide"
                >
                    <Icon path={ICONS.chevronLeft} className="w-5 h-5" />
                </button>
                <button 
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg opacity-0 hover:opacity-100 transition-opacity md:opacity-0 opacity-100 z-20"
                    onClick={nextSlide}
                    aria-label="Next Slide"
                >
                    <Icon path={ICONS.chevronRight} className="w-5 h-5" />
                </button>

                {/* Progress Indicators */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-20">
                    {itemChunks.map((_, idx) => (
                        <button 
                            key={idx} 
                            className={`h-1 rounded-full transition-all duration-300 ${currentChunkIndex === idx ? 'bg-red-600 w-4' : 'bg-gray-300 w-1.5 hover:bg-gray-400'}`}
                            onClick={() => setCurrentChunkIndex(idx)}
                            aria-label={`Go to slide group ${idx + 1}`}
                        ></button>
                    ))}
                </div>
             </div>
        </div>
    );
};

export default DocumentationSlider;
