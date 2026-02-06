import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline';
    size?: 'sm' | 'md' | 'lg';
}

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    ...props
}: ButtonProps) {
    const baseStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: 'none',
        outline: 'none',
        gap: '0.5rem',
        letterSpacing: '0.01em',
    };

    const variants = {
        primary: {
            background: 'linear-gradient(135deg, var(--accent-color) 0%, var(--accent-hover) 100%)',
            color: '#fff',
            boxShadow: '0 4px 14px 0 rgba(109, 40, 217, 0.2)',
        },
        secondary: {
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        },
        outline: {
            background: 'transparent',
            border: '2px solid var(--accent-color)',
            color: 'var(--accent-color)',
        },
    };

    const sizes = {
        sm: { padding: '0.5rem 1rem', fontSize: '0.875rem' },
        md: { padding: '0.75rem 1.5rem', fontSize: '1rem' },
        lg: { padding: '1rem 2rem', fontSize: '1.125rem' },
    };

    return (
        <button
            style={{ ...baseStyle, ...variants[variant], ...sizes[size] }}
            className={`premium-button ${className}`}
            {...props}
        >
            {children}
            <style jsx>{`
                .premium-button:hover {
                    transform: translateY(-2px);
                    filter: brightness(1.05);
                    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
                }
                .premium-button:active {
                    transform: translateY(0);
                    filter: brightness(0.95);
                }
                .premium-button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }
            `}</style>
        </button>
    );
}
