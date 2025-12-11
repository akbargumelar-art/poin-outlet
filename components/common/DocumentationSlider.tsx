
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Redemption } from '../../types';
import Icon from './Icon';
import { ICONS } from '../../constants';
import Modal from './Modal';

interface DocumentationSliderProps {
    redemptions: Redemption[];
}

const DocumentationSlider: React.FC<DocumentationSliderProps> = ({ redemptions }) => {
    // State untuk Modal Zoom (Lightbox)
    const [viewingItem, setViewingItem] = useState<Redemption | null>(null);

    // 1. Filter & Shuffle: Hanya tampilkan yang statusnya 'Selesai', punya URL foto, dan diacak urutannya.
    const validItems = useMemo(() => {
        const filtered = redemptions.filter(r => r.status === 'Selesai' && r.documentationPhotoUrl);
        
        // Algoritma Fisher-Yates Shuffle untuk pengacakan yang sempurna
        const shuffled = [...filtered];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }, [redemptions]);

    // 2. Group items into pairs (chunks of 2)
    const itemChunks = useMemo(() => {
        const chunks = [];
        const chunkSize = 2; // Menampilkan 2 foto per slide
        for (let i = 0; i < validItems.length; i += chunkSize) {
            chunks.push(validItems.slice(i, i + chunkSize));
        }
        return chunks;
    }, [validItems]);
    
    const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Kecepatan slider (ms).
    const AUTO_SLIDE_INTERVAL = 4000; 

    const resetTimeout = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    };

    // Fungsi untuk memilih slide berikutnya
    const nextSlide = () => {
        if (itemChunks.length <= 1) return;
        setCurrentChunkIndex((prev) => (prev === itemChunks.length - 1 ? 0 : prev + 1));
    };

    const prevSlide = () => {
        if (itemChunks.length <= 1) return;
        setCurrentChunkIndex((prev) => (prev === 0 ? itemChunks.length - 1 : prev - 1));
    };

    // Auto-slide effect
    useEffect(() => {
        resetTimeout();
        if (!isPaused && itemChunks.length > 1) {
            timeoutRef.current = setTimeout(
                () => setCurrentChunkIndex((prev) => (prev === itemChunks.length - 1 ? 0 : prev + 1)),
                AUTO_SLIDE_INTERVAL
            );
        }
        return () => resetTimeout();
    }, [currentChunkIndex, isPaused, itemChunks.length]);

    if (validItems.length === 0) return null;

    return (
        <section className="my-12 md:my-20 max-w-4xl mx-auto px-4">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-700 text-center mb-8">
                Bukti Penyerahan Hadiah
            </h3>
            
            <div 
                className="relative neu-card p-4 md:p-6"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
            >
                {/* Navigation Buttons */}
                {itemChunks.length > 1 && (
                    <>
                        <button 
                            onClick={prevSlide} 
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 neu-button-icon !rounded-full !bg-white/80 p-2 shadow-md hover:bg-white"
                            aria-label="Previous slide"
                        >
                            <Icon path={ICONS.chevronLeft} className="w-6 h-6 text-gray-700"/>
                        </button>
                        <button 
                            onClick={nextSlide} 
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 neu-button-icon !rounded-full !bg-white/80 p-2 shadow-md hover:bg-white"
                            aria-label="Next slide"
                        >
                            <Icon path={ICONS.chevronRight} className="w-6 h-6 text-gray-700"/>
                        </button>
                    </>
                )}

                {/* Slides Container */}
                <div className="overflow-hidden rounded-xl">
                    <div 
                        className="flex transition-transform duration-500 ease-in-out"
                        style={{ transform: `translateX(-${currentChunkIndex * 100}%)` }}
                    >
                        {itemChunks.map((chunk, index) => (
                            <div key={index} className="min-w-full flex gap-4 justify-center">
                                {chunk.map((item) => (
                                    <div key={item.id} className="w-1/2 flex flex-col items-center text-center">
                                        <div 
                                            className="w-full aspect-[4/3] rounded-lg overflow-hidden cursor-pointer group relative neu-inset p-1 bg-gray-50"
                                            onClick={() => setViewingItem(item)}
                                            title="Klik untuk memperbesar"
                                        >
                                            <img 
                                                src={item.documentationPhotoUrl} 
                                                alt={item.rewardName} 
                                                className="w-full h-full object-cover rounded-md transition-transform duration-300 group-hover:scale-110"
                                            />
                                            {/* Overlay Effect */}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                <Icon path={ICONS.eye} className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <p className="font-bold text-gray-800 text-sm md:text-base line-clamp-1">{item.rewardName}</p>
                                            <p className="text-xs text-gray-500 font-semibold">{item.userName}</p>
                                            {item.userTap && <p className="text-[10px] text-gray-400 font-mono uppercase mt-0.5">{item.userTap}</p>}
                                        </div>
                                    </div>
                                ))}
                                {/* Helper jika chunk hanya memiliki 1 item agar layout tetap rapi */}
                                {chunk.length === 1 && <div className="w-1/2"></div>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Dots Indicators */}
                {itemChunks.length > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                        {itemChunks.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentChunkIndex(idx)}
                                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                    currentChunkIndex === idx ? 'bg-red-600 w-6' : 'bg-gray-300 hover:bg-gray-400'
                                }`}
                                aria-label={`Go to slide ${idx + 1}`}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Lightbox */}
            {viewingItem && viewingItem.documentationPhotoUrl && (
                <Modal 
                    show={true} 
                    onClose={() => setViewingItem(null)} 
                    title="Bukti Penyerahan Hadiah"
                >
                    <div className="flex flex-col items-center">
                        <div className="relative w-full max-h-[70vh] flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden mb-4">
                            <img 
                                src={viewingItem.documentationPhotoUrl} 
                                alt={viewingItem.rewardName} 
                                className="max-w-full max-h-full object-contain"
                            />
                        </div>
                        <div className="text-center w-full">
                            <h4 className="text-xl font-bold text-gray-800">{viewingItem.rewardName}</h4>
                            <div className="flex justify-center items-center gap-2 mt-2 text-gray-600">
                                <Icon path={ICONS.users} className="w-4 h-4" />
                                <span className="font-semibold">{viewingItem.userName}</span>
                            </div>
                            <div className="flex justify-center items-center gap-4 mt-2 text-sm text-gray-500 border-t border-gray-200 pt-2 w-fit mx-auto">
                                {viewingItem.userTap && (
                                    <span className="bg-gray-200 px-2 py-0.5 rounded text-xs font-mono uppercase">{viewingItem.userTap}</span>
                                )}
                                <span>{new Date(viewingItem.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</span>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </section>
    );
};

export default DocumentationSlider;
