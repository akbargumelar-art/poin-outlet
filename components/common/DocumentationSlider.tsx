
import React, { useState, useMemo } from 'react';
import { Redemption } from '../../types';
import Icon from './Icon';
import { ICONS } from '../../constants';
import Modal from './Modal';

interface CardItemProps {
    item: Redemption;
    onClick: (item: Redemption) => void;
}

const CardItem: React.FC<CardItemProps> = ({ item, onClick }) => (
    <div 
        className="w-72 md:w-80 flex-shrink-0 flex flex-col items-center text-center p-3 neu-card hover:scale-105 transition-transform duration-300 cursor-pointer group bg-white/50"
        onClick={() => onClick(item)}
        title="Klik untuk memperbesar"
    >
        <div className="w-full aspect-[4/3] rounded-lg overflow-hidden relative bg-gray-100">
            <img 
                src={item.documentationPhotoUrl} 
                alt={item.rewardName} 
                className="w-full h-full object-cover"
                loading="lazy"
            />
            {/* Overlay Effect */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <Icon path={ICONS.eye} className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
            </div>
        </div>
        <div className="mt-3 w-full">
            <p className="font-bold text-gray-800 text-sm md:text-base line-clamp-1">{item.rewardName}</p>
            <p className="text-xs text-gray-500 font-semibold truncate">{item.userName}</p>
            {item.userTap && <p className="text-[10px] text-gray-400 font-mono uppercase mt-0.5">{item.userTap}</p>}
        </div>
    </div>
);

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

    // Jika data terlalu sedikit (< 5), duplikasi agar running text terlihat penuh dan loop berjalan mulus
    const itemsToRender = useMemo(() => {
        if (validItems.length === 0) return [];
        let items = [...validItems];
        // Minimal ada sekitar 5 item agar animasi terlihat bagus di layar lebar. 
        // Jika kurang, kita duplikasi listnya.
        while (items.length < 5) {
            items = [...items, ...validItems];
        }
        return items;
    }, [validItems]);

    // Hitung durasi animasi berdasarkan jumlah item agar kecepatannya konsisten
    // Semakin banyak item, semakin lama durasi agar kecepatannya tetap santai
    const animationDuration = Math.max(30, itemsToRender.length * 6); 

    if (validItems.length === 0) return null;

    return (
        <section className="my-12 md:my-20 w-full overflow-hidden">
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee ${animationDuration}s linear infinite;
                }
                /* Pause animasi saat user hover di container */
                .marquee-container:hover .animate-marquee {
                    animation-play-state: paused;
                }
            `}</style>

            <div className="max-w-6xl mx-auto px-4 mb-8">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-700 text-center">
                    Bukti Penyerahan Hadiah
                </h3>
            </div>
            
            {/* Marquee Container */}
            <div className="marquee-container flex overflow-hidden w-full mask-linear-fade">
                {/* 
                   Teknik Seamless Loop:
                   Render list dua kali berdampingan.
                   Animasi menggerakkan kedua list ke kiri sejauh -100%.
                   Karena list 2 identik dengan list 1, saat reset ke 0% mata tidak melihat perbedaannya.
                */}
                <div className="flex gap-6 animate-marquee flex-shrink-0 pl-6">
                    {itemsToRender.map((item, index) => (
                        <CardItem key={`set1-${item.id}-${index}`} item={item} onClick={setViewingItem} />
                    ))}
                </div>
                <div className="flex gap-6 animate-marquee flex-shrink-0 pl-6">
                    {itemsToRender.map((item, index) => (
                        <CardItem key={`set2-${item.id}-${index}`} item={item} onClick={setViewingItem} />
                    ))}
                </div>
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
