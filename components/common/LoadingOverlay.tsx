
import React from 'react';

interface LoadingOverlayProps {
    isVisible: boolean;
    message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible, message = "Memuat..." }) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/40 backdrop-blur-lg transition-all duration-300">
            <div className="relative flex items-center justify-center">
                {/* Outer Ring */}
                <div className="loader-ring absolute"></div>
                {/* Inner Ring */}
                <div className="loader-ring-inner"></div>
                {/* Logo or Icon in Center (Optional) */}
                <div className="absolute w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            </div>
            <div className="mt-12 text-center">
                <h3 className="text-lg font-bold text-gray-700 animate-pulse">{message}</h3>
                <p className="text-xs text-gray-500 mt-1">Mohon tunggu sebentar...</p>
            </div>
        </div>
    );
};

export default LoadingOverlay;
