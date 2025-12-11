
import React, { useState, useEffect, useRef } from 'react';
import { Redemption } from '../../types';
import Icon from './Icon';
import { ICONS } from '../../constants';

interface DocumentationSliderProps {
    redemptions: Redemption[];
}

const DocumentationSlider: React.FC<DocumentationSliderProps> = ({ redemptions }) => {
    // 1. Filter: Hanya tampilkan yang statusnya 'Selesai' DAN punya URL foto
    const validItems = redemptions.filter(r => r.status === 'Selesai' && r.documentationPhotoUrl);
    
    const [currentIndex, setCurrentIndex] = useState(0);
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
        if (validItems.length <= 1) return;

        let newIndex;
        // Pastikan index baru tidak sama dengan index sekarang agar transisi terlihat
        do {
            newIndex = Math.floor(Math.random() * validItems.length);
        } while (newIndex === currentIndex);

        setCurrentIndex(newIndex);
    };

    // Fungsi prev tetap menggunakan logika acak agar konsisten
    const prevSlide = () => {
        nextSlide(); 
    };

    useEffect(() => {
        resetTimeout();
        // Hanya jalankan auto-slide jika tidak sedang dipause
        if (validItems.length > 0 && !isPaused) {
            timeoutRef.current = setTimeout(() => {
                nextSlide();
            }, AUTO_SLIDE_INTERVAL);
        }

        return () => resetTimeout();
    }, [currentIndex, validItems.length, isPaused]);

    // Jika tidak ada data, jangan render apapun
    if (validItems.length === 0) return null;

    const currentItem = validItems[currentIndex];

    return (
        <div className="w-full max-w-3xl mx-auto my-8 md:my-10 px-4">
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
                {/* Fixed height set here: h-[450px] for mobile, h-[320px] for desktop */}
                <div className="flex flex-col md:flex-row h-[450px] md:h-[320px]">
                    
                    {/* Image Section (Half Width) */}
                    <div className="w-full md:w-1/2 h-1/2 md:h-full p-4 flex items-center justify-center bg-gray-50/50">
                        <div className="relative w-full h-full neu-inset p-2 rounded-xl flex items-center justify-center overflow-hidden group">
                            {/* Loading Placeholder / Image */}
                            <img 
                                key={currentItem.id} // Key helps react verify DOM change for animation
                                src={currentItem.documentationPhotoUrl} 
                                alt={currentItem.rewardName} 
                                className="w-full h-full object-cover rounded-lg shadow-sm transition-transform duration-500 hover:scale-105"
                            />
                            <div className="absolute top-4 right-4 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md animate-fade-in-down">
                                Terverifikasi
                            </div>
                        </div>
                    </div>

                    {/* Content Section (Half Width) */}
                    <div className="w-full md:w-1/2 h-1/2 md:h-full p-5 md:p-6 flex flex-col justify-center text-left relative">
                        {/* Quote Icon Background */}
                        <div className="absolute top-4 right-6 text-gray-200 pointer-events-none">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V11C14.017 11.5523 13.5693 12 13.017 12H12.017V5H22.017V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM5.01691 21L5.01691 18C5.01691 16.8954 5.91234 16 7.01691 16H10.0169C10.5692 16 11.0169 15.5523 11.0169 15V9C11.0169 8.44772 10.5692 8 10.0169 8H6.01691C5.46462 8 5.01691 8.44772 5.01691 9V11C5.01691 11.5523 4.56919 12 4.01691 12H3.01691V5H13.0169V15C13.0169 18.3137 10.3306 21 7.01691 21H5.01691Z" /></svg>
                        </div>

                        <div className="space-y-4 z-10">
                            <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Hadiah</p>
                                <h4 className="text-xl md:text-2xl font-extrabold text-red-600 drop-shadow-sm leading-tight line-clamp-2">
                                    {currentItem.rewardName}
                                </h4>
                            </div>

                            <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Penerima</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs shrink-0">
                                        {currentItem.userName ? currentItem.userName.charAt(0) : 'M'}
                                    </div>
                                    <h4 className="text-lg font-bold text-gray-800 line-clamp-1">{currentItem.userName || 'Mitra Setia'}</h4>
                                </div>
                                <div className="inline-block bg-blue-100 text-blue-800 rounded-md px-2 py-0.5 text-[10px] font-bold mt-1">
                                    TAP {currentItem.userTap || 'Unknown Area'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Arrows (Visible on Hover or Mobile) */}
                <button 
                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity md:opacity-0 opacity-100 z-20"
                    onClick={prevSlide}
                    aria-label="Previous Slide"
                >
                    <Icon path={ICONS.chevronLeft} className="w-5 h-5" />
                </button>
                <button 
                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity md:opacity-0 opacity-100 z-20"
                    onClick={nextSlide}
                    aria-label="Next Slide"
                >
                    <Icon path={ICONS.chevronRight} className="w-5 h-5" />
                </button>

                {/* Progress Indicators */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-20">
                    {validItems.map((_, idx) => (
                        <button 
                            key={idx} 
                            className={`h-1 rounded-full transition-all duration-300 ${currentIndex === idx ? 'bg-red-600 w-6' : 'bg-gray-300 w-1.5 hover:bg-gray-400'}`}
                            onClick={() => setCurrentIndex(idx)}
                            aria-label={`Go to slide ${idx + 1}`}
                        ></button>
                    ))}
                </div>
             </div>
        </div>
    );
};

export default DocumentationSlider;
