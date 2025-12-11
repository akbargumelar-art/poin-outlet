
import React from 'react';
import Icon from './Icon';
import { ICONS } from '../../constants';

interface PaginationProps {
    itemsPerPage: number;
    totalItems: number;
    paginate: (pageNumber: number) => void;
    currentPage: number;
}

const Pagination: React.FC<PaginationProps> = ({ itemsPerPage, totalItems, paginate, currentPage }) => {
    const pageNumbers = [];
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) return null;

    // Logic to show limited page numbers (e.g., 1, 2, ..., 10, 11)
    const maxPageButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

    if (endPage - startPage + 1 < maxPageButtons) {
        startPage = Math.max(1, endPage - maxPageButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
    }

    return (
        <div className="flex justify-center items-center gap-2 mt-6">
            <button 
                onClick={() => paginate(currentPage - 1)} 
                disabled={currentPage === 1}
                className="p-2 rounded-lg neu-button !w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Icon path={ICONS.chevronLeft} className="w-5 h-5" />
            </button>
            
            {startPage > 1 && (
                <>
                    <button onClick={() => paginate(1)} className="w-8 h-8 rounded-lg neu-button !p-0 flex items-center justify-center text-sm">1</button>
                    {startPage > 2 && <span className="text-gray-400">...</span>}
                </>
            )}

            {pageNumbers.map(number => (
                <button
                    key={number}
                    onClick={() => paginate(number)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                        currentPage === number 
                            ? 'bg-red-600 text-white shadow-md transform scale-110' 
                            : 'neu-button !p-0 hover:text-red-600'
                    }`}
                >
                    {number}
                </button>
            ))}

            {endPage < totalPages && (
                <>
                    {endPage < totalPages - 1 && <span className="text-gray-400">...</span>}
                    <button onClick={() => paginate(totalPages)} className="w-8 h-8 rounded-lg neu-button !p-0 flex items-center justify-center text-sm">{totalPages}</button>
                </>
            )}

            <button 
                onClick={() => paginate(currentPage + 1)} 
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg neu-button !w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Icon path={ICONS.chevronRight} className="w-5 h-5" />
            </button>
            
            <span className="text-xs text-gray-500 ml-2">
                Total {totalItems} Data
            </span>
        </div>
    );
};

export default Pagination;
