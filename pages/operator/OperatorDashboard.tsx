
import React from 'react';
import { Page } from '../../types';
import Icon from '../../components/common/Icon';
import { ICONS } from '../../constants';

interface OperatorDashboardProps {
    setCurrentPage: (page: Page) => void;
}

const OperatorDashboard: React.FC<OperatorDashboardProps> = ({ setCurrentPage }) => {
    return (
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-700 mb-8">Operator Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <button 
                    onClick={() => setCurrentPage('manajemenNomor')} 
                    className="neu-card p-8 text-center hover:bg-slate-100/50 transition-colors duration-200"
                >
                    <Icon path={ICONS.simCard} className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-800">Kelola Nomor Spesial</h2>
                    <p className="text-gray-500 mt-2">Tambah, edit, hapus, dan ubah status ketersediaan nomor spesial.</p>
                </button>
                <button 
                    onClick={() => setCurrentPage('manajemenPoin')} 
                    className="neu-card p-8 text-center hover:bg-slate-100/50 transition-colors duration-200"
                >
                    <Icon path={ICONS.upload} className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-800">Upload Transaksi</h2>
                    <p className="text-gray-500 mt-2">Unggah data transaksi mitra outlet secara massal menggunakan file Excel.</p>
                </button>
            </div>
        </div>
    );
};

export default OperatorDashboard;
