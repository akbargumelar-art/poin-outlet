import React from 'react';
import { ICONS } from '../../constants';
import Icon from './Icon';

interface ThemeToggleProps {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme }) => {
    return (
        <button
            onClick={toggleTheme}
            className="neu-button-icon !p-3" // Removed fixed positioning classes
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            {theme === 'light' ? (
                <Icon path={ICONS.moon} className="w-6 h-6" />
            ) : (
                <Icon path={ICONS.sun} className="w-6 h-6" />
            )}
        </button>
    );
};

export default ThemeToggle;