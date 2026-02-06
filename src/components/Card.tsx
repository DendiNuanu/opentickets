import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

export default function Card({ children, className = '', style = {} }: CardProps) {
    return (
        <div
            className={`glass ${className}`}
            style={{
                padding: '1.5rem',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'var(--card-shadow)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                ...style
            }}
        >
            {children}
        </div>
    );
}
