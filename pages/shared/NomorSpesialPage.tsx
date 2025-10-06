import React, { useState, useMemo } from 'react';
import { User, SpecialNumber } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';

interface NomorSpesialPageProps {
    currentUser: User;
    numbers: SpecialNumber[];
    recipientNumber: string;
}

const NomorSpesialPage: React.FC<NomorSpesialPageProps> = ({ currentUser, numbers, recipientNumber }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const priceFilters = useMemo(() => {
        // FIX: Add explicit types for sort comparison function arguments.
        // This resolves a TypeScript error where the types of `a` and `b` were not correctly inferred as numbers.
        return [...new Set(numbers.map(n => n.price))].sort((a: number, b: number) => a - b);
    }, [numbers]);

    const filteredNumbers = useMemo(() => {
        let result = [...numbers];
        if (selectedPrice) {
            result = result.filter(n => n.price === selectedPrice);
        }
        if (searchTerm) {
            result = result.filter(n => n.phoneNumber.includes(searchTerm));
        }
        result.sort((a, b) => {
            return sortOrder === 'asc' ? a.price - b.price : b.price - a.price;
        });
        return result;
    }, [numbers, searchTerm, selectedPrice, sortOrder]);

    const handleSelect = (id: number) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(filteredNumbers.map(n => n.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const totalSelected = useMemo(() => {
        return numbers.filter(n => selectedIds.has(n.id));
    }, [numbers, selectedIds]);

    const totalSelectedPrice = useMemo(() => {
        return totalSelected.reduce((sum, n) => sum + n.price, 0);
    }, [totalSelected]);

    const handleBeli = () => {
        if (totalSelected.length === 0 || !recipientNumber) return;

        const listItems = totalSelected.map(n => `${n.phoneNumber} | ${n.price.toLocaleString('id-ID')}`).join('\n');
        
        const message = `Halo Kak, saya ${currentUser.profile.nama} dari TAP ${currentUser.profile.tap || 'N/A'} ingin membeli Nomor spesial:
${listItems}

Total:
Rp ${totalSelectedPrice.toLocaleString('id-ID')} / ${totalSelected.length} pcs`;

        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${recipientNumber}?text=${encodedMessage}`, '_blank');
    };
    
    return (
        <div className="pb-24">
            <div className="neu-card overflow-hidden mb-6">
                 <img src="https://i.ibb.co/pnvBFV5/nomor-spesial-banner.png" alt="Nomor Spesial Banner" className="w-full h-auto object-cover"/>
            </div>

            <div className="neu-card p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-wrap gap-2">
                         {priceFilters.map(price => (
                            <button key={price} onClick={() => setSelectedPrice(price)} className={`px-3 py-1 text-sm rounded-md transition-colors ${selectedPrice === price ? 'neu-inset text-red-600 font-bold' : 'neu-button !w-auto !py-1 !px-3'}`}>
                                Rp {price.toLocaleString('id-ID')}
                            </button>
                        ))}
                         <button onClick={() => setSelectedPrice(null)} className={`px-3 py-1 text-sm rounded-md transition-colors ${selectedPrice === null ? 'neu-inset text-red-600 font-bold' : 'neu-button !w-auto !py-1 !px-3'}`}>
                                Tampilkan Semua
                         </button>
                    </div>
                     <input
                        type="text"
                        placeholder="Cari nomor... (e.g., 888)"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="input-field"
                    />
                </div>
            </div>
            
            <div className="neu-card-flat overflow-x-auto mt-6">
                <table className="w-full text-left">
                    <thead className="bg-slate-200/50">
                        <tr>
                            <th className="p-4 font-semibold">Nomor</th>
                            <th className="p-4 font-semibold whitespace-nowrap">
                                <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="flex items-center gap-1">
                                    Harga
                                    <Icon path={sortOrder === 'asc' ? 'M7 14l5-5 5 5H7z' : 'M7 10l5 5 5-5H7z'} className="w-4 h-4" />
                                </button>
                            </th>
                            <th className="p-4">
                                <input 
                                    type="checkbox" 
                                    className="h-5 w-5 rounded"
                                    onChange={handleSelectAll}
                                    checked={filteredNumbers.length > 0 && selectedIds.size === filteredNumbers.length}
                                />
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredNumbers.map(n => (
                             <tr key={n.id} className="border-t border-slate-200/80">
                                <td className="p-4 font-bold text-lg text-gray-800 tracking-wider">{n.phoneNumber}</td>
                                <td className="p-4 font-semibold text-red-600">Rp {n.price.toLocaleString('id-ID')}</td>
                                <td className="p-4">
                                    <input 
                                        type="checkbox" 
                                        className="h-5 w-5 rounded"
                                        checked={selectedIds.has(n.id)}
                                        onChange={() => handleSelect(n.id)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredNumbers.length === 0 && <p className="p-8 text-center text-gray-500">Tidak ada nomor yang cocok.</p>}
            </div>

            {totalSelected.length > 0 && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-lg z-20 px-4">
                    <div className="neu-card-flat rounded-xl p-4 flex justify-between items-center animate-fade-in-up">
                        <div>
                            <p className="font-bold text-gray-800">{totalSelected.length} nomor dipilih</p>
                            <p className="text-sm font-semibold text-red-600">Total: Rp {totalSelectedPrice.toLocaleString('id-ID')}</p>
                        </div>
                        <button onClick={handleBeli} disabled={!recipientNumber} className="neu-button !w-auto px-4 flex items-center gap-2 text-green-600">
                             <Icon path={ICONS.whatsapp} className="w-5 h-5"/>
                            Beli via WhatsApp
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NomorSpesialPage;