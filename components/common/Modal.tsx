
import React from 'react';
import Icon from './Icon';
import { ICONS } from '../../constants';

interface ModalProps {
    show: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ show, onClose, title, children }) => {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="neu-card w-full max-w-md m-4 animate-modal-in">
                <div className="flex justify-between items-center p-5">
                    <h3 className="text-xl font-semibold text-gray-700">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-600"><Icon path={ICONS.close} className="w-7 h-7" /></button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

export default Modal;
