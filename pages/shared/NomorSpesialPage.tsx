import React, { useState, useMemo } from 'react';
import { User, SpecialNumber } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';

// FIX: Simplified the type to remove redundant keys. `keyof SpecialNumber` already includes these.
type SortableKeys = keyof SpecialNumber;

interface NomorSpesialPageProps {
    currentUser: User;
    numbers: SpecialNumber[];
    recipientNumber: string;
    specialNumberBannerUrl: string | null;
}

const NomorSpesialPage: React.FC<NomorSpesialPageProps> = ({ currentUser, numbers, recipientNumber, specialNumberBannerUrl }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
    const [locationFilter, setLocationFilter] = useState<string>('');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' } | null>({ key: 'price', direction: 'asc' });

    const isSupervisor = currentUser.role === 'supervisor';

    const priceFilters = useMemo(() => {
        // FIX: Explicitly convert sort parameters to numbers to satisfy TypeScript's strict arithmetic operation rules.
        return [...new Set(numbers.map(n => n.price))].sort((a, b) => Number(a) - Number(b));
    }, [numbers]);
    
    const allLocations = useMemo(() => {
        return [...new Set(numbers.map(n => n.lokasi).filter(Boolean))].sort() as string[];
    }, [numbers]);


    const sortedAndFilteredNumbers = useMemo(() => {
        let filtered = [...numbers];
        if (selectedPrice) {
            filtered = filtered.filter(n => n.price === selectedPrice);
        }
        if (isSupervisor && locationFilter) {
            filtered = filtered.filter(n => n.lokasi === locationFilter);
        }
        if (searchTerm) {
            filtered = filtered.filter(n => n.phoneNumber.includes(searchTerm));
        }

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                
                if (aValue === undefined || aValue === null) return 1;
                if (bValue === undefined || bValue === null) return -1;
                
                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return filtered;
    }, [numbers, searchTerm, selectedPrice, sortConfig, isSupervisor, locationFilter]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortableKeys) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <Icon path="M12 5.83l2.59 2.59L16 7l-4-4-4 4 1.41 1.41L10 5.83v12.34h2V5.83z" className="w-4 h-4 text-gray-400" />;
        }
        if (sortConfig.direction === 'asc') {
            return <Icon path="M12 4l-1.41 1.41L12 2.83l1.41 1.41L12 4zm0 16l-1.41-1.41L12 21.17l1.41-1.41L12 20z" className="w-4 h-4" />;
        }
        return <Icon path="M12 20l1.41-1.41L12 21.17l-1.41-1.41L12 20zM12 4l1.41 1.41L12 2.83 10.59 4.24 12 4z" className="w-4 h-4" />;
    };


    const handleSelect = (id: number) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedIds(e.target.checked ? new Set(sortedAndFilteredNumbers.map(n => n.id)) : new Set());
    };

    const totalSelected = useMemo(() => numbers.filter(n => selectedIds.has(n.id)), [numbers, selectedIds]);
    const totalSelectedPrice = useMemo(() => totalSelected.reduce((sum, n) => sum + n.price, 0), [totalSelected]);

    const handleBeli = () => {
        if (totalSelected.length === 0 || !recipientNumber) return;
        const listItems = totalSelected.map(n => `- ${n.phoneNumber} | ${n.price.toLocaleString('id-ID', { maximumFractionDigits: 2 })}`).join('\n');
        const message = `Halo Kak, saya ${currentUser.profile.nama} dari ${currentUser.profile.tap || 'N/A'} ingin membeli Nomor spesial:\n\n${listItems}\n\n*Total:*\n- Rp ${totalSelectedPrice.toLocaleString('id-ID', { maximumFractionDigits: 2 })} / ${totalSelected.length} pcs`;
        window.open(`https://wa.me/${recipientNumber}?text=${encodeURIComponent(message)}`, '_blank');
    };
    
    return (
        <div>
            <div>
                <div className="neu-card overflow-hidden mb-6">
                    <img src={specialNumberBannerUrl || "https://i.ibb.co/pnvBFV5/nomor-spesial-banner.png"} alt="Nomor Spesial Banner" className="w-full h-auto object-cover aspect-[3/1]" />
                </div>
                <div className="neu-card p-4 mb-6">
                    <div className="flex flex-wrap gap-2 mb-4">
                        {priceFilters.map(price => (
                            <button key={price} onClick={() => setSelectedPrice(price)} className={`px-3 py-1 text-sm rounded-md font-semibold transition-colors ${selectedPrice === price ? 'bg-red-600 text-white shadow-inner' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                                Rp {price.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                            </button>
                        ))}
                        <button onClick={() => setSelectedPrice(null)} className={`px-3 py-1 text-sm rounded-md font-semibold transition-colors ${selectedPrice === null ? 'bg-red-600 text-white shadow-inner' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                            Tampilkan Semua
                        </button>
                    </div>
                     <div className={`grid grid-cols-1 ${isSupervisor ? 'md:grid-cols-2' : ''} gap-4`}>
                        <input type="text" placeholder="Cari nomor... (e.g., 888)" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-field w-full" />
                         {isSupervisor && (
                            <select
                                value={locationFilter}
                                onChange={(e) => setLocationFilter(e.target.value)}
                                className="input-field w-full"
                            >
                                <option value="">Semua Lokasi</option>
                                {allLocations.map(loc => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200/80 flex justify-between items-center">
                        <div>
                            <p className="font-bold text-gray-800">{totalSelected.length} nomor dipilih</p>
                            <p className="text-sm font-semibold text-red-600">Total: Rp {totalSelectedPrice.toLocaleString('id-ID', { maximumFractionDigits: 2 })}</p>
                        </div>
                        <button onClick={handleBeli} disabled={!recipientNumber || totalSelected.length === 0} className="neu-button !w-auto px-4 flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 disabled:!bg-gray-400">
                            <Icon path={ICONS.whatsapp} className="w-5 h-5" />
                            Beli via WhatsApp
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="neu-card-flat overflow-hidden">
                <div className="overflow-auto max-h-[60vh]">
                    <table className="w-full min-w-max text-left">
                        <thead className="bg-slate-200/80 backdrop-blur-sm sticky top-0 z-10">
                            <tr>
                                <th className="p-4"><button onClick={() => requestSort('phoneNumber')} className="font-semibold flex items-center gap-1">Nomor {getSortIcon('phoneNumber')}</button></th>
                                {isSupervisor && <th className="p-4"><button onClick={() => requestSort('sn')} className="font-semibold flex items-center gap-1">SN {getSortIcon('sn')}</button></th>}
                                {isSupervisor && <th className="p-4"><button onClick={() => requestSort('lokasi')} className="font-semibold flex items-center gap-1">Lokasi {getSortIcon('lokasi')}</button></th>}
                                <th className="p-4"><button onClick={() => requestSort('price')} className="font-semibold flex items-center gap-1 whitespace-nowrap">Harga {getSortIcon('price')}</button></th>
                                <th className="p-4">
                                    <input type="checkbox" className="h-5 w-5 rounded" onChange={handleSelectAll} checked={sortedAndFilteredNumbers.length > 0 && selectedIds.size > 0 && selectedIds.size === sortedAndFilteredNumbers.length} />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAndFilteredNumbers.length > 0 ? (
                                sortedAndFilteredNumbers.map(n => (
                                    <tr key={n.id} className="border-t border-slate-200/80">
                                        <td className="p-4 font-bold text-lg text-gray-800 tracking-wider">{n.phoneNumber}</td>
                                        {isSupervisor && <td className="p-4 font-mono text-sm">{n.sn || '-'}</td>}
                                        {isSupervisor && <td className="p-4">{n.lokasi || '-'}</td>}
                                        <td className="p-4 font-semibold text-red-600">Rp {n.price.toLocaleString('id-ID', { maximumFractionDigits: 2 })}</td>
                                        <td className="p-4">
                                            <input type="checkbox" className="h-5 w-5 rounded" checked={selectedIds.has(n.id)} onChange={() => handleSelect(n.id)} />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={isSupervisor ? 5 : 3} className="p-8 text-center text-gray-500">Tidak ada nomor yang cocok.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default NomorSpesialPage;