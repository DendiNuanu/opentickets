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
        borderRadius: '8px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        border: 'none',
        outline: 'none',
    };

    const variants = {
        primary: {
            background: 'var(--accent-color)',
            color: '#fff', // Always white for contrast on accent
            boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)',
        },
        secondary: {
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
        },
        outline: {
            background: 'transparent',
            border: '2px solid var(--accent-color)',
            color: 'var(--accent-color)',
        },
    };

    const sizes = {
        sm: { padding: '0.4rem 0.8rem', fontSize: '0.875rem' },
        md: { padding: '0.6rem 1.2rem', fontSize: '1rem' },
        lg: { padding: '0.8rem 1.6rem', fontSize: '1.125rem' },
    };

    return (
        <button
            style={{ ...baseStyle, ...variants[variant], ...sizes[size] }}
            className={`hover-effect ${className}`}
            {...props}
        >
            {children}
            <style jsx>{`
        .hover-effect:hover {
          transform: translateY(-1px);
          filter: brightness(1.1);
          box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        }
        .hover-effect:active {
          transform: translateY(0);
        }
      `}</style>
        </button>
    );
}
