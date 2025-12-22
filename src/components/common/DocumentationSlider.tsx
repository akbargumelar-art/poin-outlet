
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Redemption } from '../../types';
import Icon from './Icon';
import { ICONS } from '../../constants';
import Modal from './Modal';

interface CardItemProps {
    item: Redemption;
    onClick: (item: Redemption) => void;
}

const CardItem: React.FC<CardItemProps> = React.memo(({ item, onClick }) => (
    <div 
        className="w-72 md:w-80 flex-shrink-0 flex flex-col items-center text-center p-3 neu-card hover:scale-105 transition-transform duration-300 cursor-pointer group bg-white/50 select-none"
        onPointerUp={(e) => {
            // Prevent firing click if it was a drag operation
            // We'll handle this check in the parent, but here we simply allow the click
            // The parent's drag logic will prevent onClick if movement occurred
             onClick(item);
        }}
    >
        <div className="w-full aspect-[4/3] rounded-lg overflow-hidden relative bg-gray-100 pointer-events-none"> 
            {/* pointer-events-none on image ensures drag events bubble to container properly */}
            <img 
                src={item.documentationPhotoUrl} 
                alt={item.rewardName} 
                className="w-full h-full object-cover"
                loading="lazy"
                draggable={false}
            />
            {/* Overlay Effect */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <Icon path={ICONS.eye} className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
            </div>
        </div>
        <div className="mt-3 w-full pointer-events-none">
            <p className="font-bold text-gray-800 text-sm md:text-base line-clamp-1">{item.rewardName}</p>
            <p className="text-xs text-gray-500 font-semibold truncate">{item.userName}</p>
            {item.userTap && <p className="text-[10px] text-gray-400 font-mono uppercase mt-0.5">{item.userTap}</p>}
        </div>
    </div>
));

interface DocumentationSliderProps {
    redemptions: Redemption[];
}

const DocumentationSlider: React.FC<DocumentationSliderProps> = ({ redemptions }) => {
    const [viewingItem, setViewingItem] = useState<Redemption | null>(null);
    
    // Refs for animation logic
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null); // Represents one set of items
    const requestRef = useRef<number>(0);
    const positionRef = useRef<number>(0);
    const isDragging = useRef<boolean>(false);
    const startX = useRef<number>(0);
    const startPos = useRef<number>(0);
    const isClickAllowed = useRef<boolean>(true); // To distinguish drag vs click

    // Speed configuration (Agak cepat)
    const BASE_SPEED = 0.8; 
    
    // 1. Data Processing: Sort by Date Descending (Newest First)
    const validItems = useMemo(() => {
        return redemptions
            .filter(r => r.status === 'Selesai' && r.documentationPhotoUrl)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [redemptions]);

    // Ensure enough items for smooth loop
    const itemsToRender = useMemo(() => {
        if (validItems.length === 0) return [];
        let items = [...validItems];
        while (items.length < 5) {
            items = [...items, ...validItems];
        }
        return items;
    }, [validItems]);

    // 2. Animation Loop
    const animate = useCallback(() => {
        if (!isDragging.current) {
            positionRef.current -= BASE_SPEED;
        }

        // Logic for seamless looping
        if (contentRef.current) {
            const contentWidth = contentRef.current.scrollWidth; // Width of ONE set
            
            // If moved left past the first set, snap back to 0
            if (positionRef.current <= -contentWidth) {
                positionRef.current += contentWidth;
            }
            // If moved right past 0 (dragged right), snap to -contentWidth
            if (positionRef.current > 0) {
                positionRef.current -= contentWidth;
            }

            // Apply transform
            if (containerRef.current) {
                containerRef.current.style.transform = `translateX(${positionRef.current}px)`;
            }
        }

        requestRef.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
        if (itemsToRender.length > 0) {
            requestRef.current = requestAnimationFrame(animate);
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [animate, itemsToRender]);


    // 3. Drag / Interaction Handlers
    const handlePointerDown = (e: React.PointerEvent) => {
        isDragging.current = true;
        startX.current = e.clientX;
        startPos.current = positionRef.current;
        isClickAllowed.current = true;
        
        // Change cursor
        if (containerRef.current) {
            containerRef.current.style.cursor = 'grabbing';
        }
        // Capture pointer to track outside window
        (e.target as Element).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging.current) return;

        const currentX = e.clientX;
        const diff = currentX - startX.current;

        // If moved more than 5 pixels, it's a drag, not a click
        if (Math.abs(diff) > 5) {
            isClickAllowed.current = false;
        }

        positionRef.current = startPos.current + diff;
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        isDragging.current = false;
        if (containerRef.current) {
            containerRef.current.style.cursor = 'grab';
        }
        (e.target as Element).releasePointerCapture(e.pointerId);
    };

    // Wrapper for onClick to prevent opening modal if user was dragging
    const handleCardClick = useCallback((item: Redemption) => {
        if (isClickAllowed.current) {
            setViewingItem(item);
        }
    }, []);


    if (validItems.length === 0) return null;

    return (
        <section className="my-12 md:my-20 w-full overflow-hidden select-none">
            <style>{`
                .mask-linear-fade {
                    mask-image: linear-gradient(to right, transparent, black 3%, black 97%, transparent);
                    -webkit-mask-image: linear-gradient(to right, transparent, black 3%, black 97%, transparent);
                }
            `}</style>

            <div className="w-full mx-auto">
                <div className="mb-8 px-4">
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-700 text-center">
                        Bukti Penyerahan Hadiah
                    </h3>
                    <p className="text-center text-xs text-gray-400 mt-2">(Geser untuk melihat lebih banyak)</p>
                </div>
                
                {/* Wrapper Container */}
                <div className="relative w-full">
                    {/* Darker Border Shadow Overlays (Gradient from black to transparent) */}
                    <div className="absolute inset-y-0 left-0 w-8 md:w-16 bg-gradient-to-r from-black/10 to-transparent z-10 pointer-events-none rounded-l-xl"></div>
                    <div className="absolute inset-y-0 right-0 w-8 md:w-16 bg-gradient-to-l from-black/10 to-transparent z-10 pointer-events-none rounded-r-xl"></div>

                    {/* Scrollable Track with Mask */}
                    <div 
                        className="w-full mask-linear-fade overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y"
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                    >
                        {/* Moving Track */}
                        <div 
                            ref={containerRef}
                            className="flex gap-6 w-max will-change-transform"
                        >
                            {/* Set 1 (Ref for width measurement) */}
                            <div ref={contentRef} className="flex gap-6">
                                {itemsToRender.map((item, index) => (
                                    <CardItem key={`set1-${item.id}-${index}`} item={item} onClick={handleCardClick} />
                                ))}
                            </div>
                            
                            {/* Set 2 (Duplicate for loop) */}
                            <div className="flex gap-6">
                                {itemsToRender.map((item, index) => (
                                    <CardItem key={`set2-${item.id}-${index}`} item={item} onClick={handleCardClick} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Lightbox */}
            {viewingItem && viewingItem.documentationPhotoUrl && (
                <Modal 
                    show={true} 
                    onClose={() => setViewingItem(null)} 
                    title={`Detail Penyerahan: ${viewingItem.rewardName}`}
                >
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Photo */}
                        <div className="w-full md:w-1/2 flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden min-h-[300px]">
                            <img 
                                src={viewingItem.documentationPhotoUrl} 
                                alt={viewingItem.rewardName} 
                                className="w-full h-auto object-contain max-h-[60vh] rounded-lg shadow-sm"
                            />
                        </div>
                        {/* Details */}
                        <div className="w-full md:w-1/2 space-y-6">
                            <div>
                                <h4 className="font-bold text-gray-700 text-lg mb-2 border-b pb-2">Informasi Penerima</h4>
                                <table className="w-full text-sm">
                                    <tbody>
                                        <tr><td className="text-gray-500 py-1 w-32">Nama Mitra:</td><td className="font-semibold">{viewingItem.userName}</td></tr>
                                        <tr><td className="text-gray-500 py-1">TAP:</td><td className="font-mono">{viewingItem.userTap || '-'}</td></tr>
                                        <tr><td className="text-gray-500 py-1">Nama Penerima:</td><td className="font-medium">{viewingItem.receiverName || '-'}</td></tr>
                                        <tr><td className="text-gray-500 py-1">Jabatan:</td><td>{viewingItem.receiverRole || '-'}</td></tr>
                                    </tbody>
                                </table>
                            </div>

                            <div>
                                <h4 className="font-bold text-gray-700 text-lg mb-2 border-b pb-2">Detail Penyerahan</h4>
                                <table className="w-full text-sm">
                                    <tbody>
                                        <tr><td className="text-gray-500 py-1 w-32">Tanggal:</td><td>{new Date(viewingItem.date).toLocaleString('id-ID')}</td></tr>
                                        <tr><td className="text-gray-500 py-1">Surveyor:</td><td>{viewingItem.surveyorName || '-'}</td></tr>
                                        <tr><td className="text-gray-500 py-1">Lokasi:</td><td>
                                            {viewingItem.locationCoordinates ? (
                                                <a 
                                                    href={`https://www.google.com/maps/search/?api=1&query=${viewingItem.locationCoordinates}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline flex items-center gap-1"
                                                >
                                                    <Icon path={ICONS.location} className="w-4 h-4"/>
                                                    {viewingItem.locationCoordinates}
                                                </a>
                                            ) : '-'}
                                        </td></tr>
                                        <tr><td className="text-gray-500 py-1">Catatan:</td><td className="italic text-gray-600">"{viewingItem.statusNote || '-'}"</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="pt-4 mt-auto">
                                <button onClick={() => setViewingItem(null)} className="neu-button w-full">Tutup</button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </section>
    );
};

export default DocumentationSlider;
