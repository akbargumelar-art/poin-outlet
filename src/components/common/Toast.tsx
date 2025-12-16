
import React, { useEffect } from 'react';
import Icon from './Icon';
import { ICONS } from '../../constants';

interface ToastProps {
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000); // Auto close after 3 seconds

        return () => clearTimeout(timer);
    }, [onClose]);

    const isSuccess = type === 'success';

    return (
        <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-fade-in-down transition-all duration-300 ${
            isSuccess 
                ? 'bg-white border-green-200 text-green-800' 
                : 'bg-white border-red-200 text-red-800'
        }`}>
            <div className={`p-1 rounded-full ${isSuccess ? 'bg-green-100' : 'bg-red-100'}`}>
                <Icon 
                    path={isSuccess ? "M5 13l4 4L19 7" : ICONS.close} 
                    className={`w-5 h-5 ${isSuccess ? 'text-green-600' : 'text-red-600'}`} 
                />
            </div>
            <div>
                <h4 className="font-bold text-sm">{isSuccess ? 'Berhasil' : 'Gagal'}</h4>
                <p className="text-xs opacity-90">{message}</p>
            </div>
            <button onClick={onClose} className="ml-4 text-gray-400 hover:text-gray-600">
                <Icon path={ICONS.close} className="w-4 h-4" />
            </button>
        </div>
    );
};

export default Toast;
