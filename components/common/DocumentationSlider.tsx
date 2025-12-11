import React, { useState, useEffect, useRef } from 'react';
import { Redemption } from '../../types';

interface DocumentationSliderProps {
    redemptions: Redemption[];
}

const DocumentationSlider: React.FC<DocumentationSliderProps> = ({ redemptions }) => {
    // Filter valid documentations (must be finished status and have a photo URL)
    const validItems = redemptions.filter(r => r.status === 'Selesai' && r.documentationPhotoUrl);
    
    const [currentIndex, setCurrentIndex] = useState(0);
    // Use ReturnType<typeof setTimeout> for better cross-environment compatibility (Node/Browser)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resetTimeout = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    };

    useEffect(() => {
        resetTimeout();
        if (validItems.length > 0) {
            timeoutRef.current = setTimeout(() => {
                setCurrentIndex((prevIndex) => 
                    prevIndex === validItems.length - 1 ? 0 : prevIndex + 1
                );
            }, 5000); // 5 seconds duration
        }

        return () => resetTimeout();
    }, [currentIndex, validItems.length]);

    if (validItems.length === 0) return null;

    return (
        <div className="w-full max-w-3xl xl:max-w-6xl mx-auto my-12 md:my-16">
             <h3 className="text-2xl md:text-3xl font-bold text-gray-700 text-center mb-8">Bukti Penyerahan Hadiah</h3>
             <div className="neu-card overflow-hidden relative group bg-white/50">
                <div 
                    className="whitespace-nowrap transition-transform duration-1000 ease-in-out" 
                    style={{ transform: `translateX(${-currentIndex * 100}%)` }}
                >
                    {validItems.map((item, index) => (
                        <div key={`${item.id}-${index}`} className="inline-block w-full align-top whitespace-normal">
                             <div className="flex flex-col md:flex-row items-center justify-center p-6 gap-6 min-h-[400px]">
                                <div className="w-full md:w-1/2 flex justify-center items-center h-full">
                                    <div className="neu-inset p-2 rounded-xl">
                                        <img 
                                            src={item.documentationPhotoUrl} 
                                            alt={item.rewardName} 
                                            className="max-h-[350px] w-auto object-contain rounded-lg shadow-sm"
                                        />
                                    </div>
                                </div>
                                <div className="w-full md:w-1/2 text-center md:text-left space-y-6 px-4">
                                    <div className="space-y-1">
                                        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Hadiah</p>
                                        <h4 className="text-3xl font-extrabold text-red-600 drop-shadow-sm">{item.rewardName}</h4>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Penerima</p>
                                        <h4 className="text-xl font-bold text-gray-800">{item.userName || 'Mitra Setia'}</h4>
                                        <div className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mt-2">
                                            {item.userTap || 'Unknown Area'}
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-gray-200">
                                        <p className="text-sm text-gray-500 font-medium italic">
                                            Diserahkan pada {new Date(item.statusUpdatedAt || item.date).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                                        </p>
                                    </div>
                                </div>
                             </div>
                        </div>
                    ))}
                </div>

                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                    {validItems.map((_, idx) => (
                        <button 
                            key={idx} 
                            className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${currentIndex === idx ? 'bg-red-600 w-8' : 'bg-gray-300 hover:bg-gray-400'}`}
                            onClick={() => setCurrentIndex(idx)}
                        ></button>
                    ))}
                </div>
                
                {/* Optional Navigation Arrows */}
                 <button 
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hidden md:block"
                    onClick={() => setCurrentIndex(prev => prev === 0 ? validItems.length - 1 : prev - 1)}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <button 
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hidden md:block"
                    onClick={() => setCurrentIndex(prev => prev === validItems.length - 1 ? 0 : prev + 1)}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
             </div>
        </div>
    );
};

export default DocumentationSlider;