'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
    const [theme, setTheme] = useState('dracula');

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'dracula';
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'dracula' ? 'light' : 'dracula';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    return (
        <button
            onClick={toggleTheme}
            className="toggle-btn"
            aria-label="Toggle Theme"
            style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                padding: '0.5rem',
                borderRadius: '50%',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                transition: 'all 0.2s ease',
            }}
        >
            {theme === 'dracula' ? '☀️' : '🧛'}
        </button>
    );
}
