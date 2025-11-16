import React from 'react';

export const AppLogo: React.FC = () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor: '#818cf8', stopOpacity: 1}} />
                <stop offset="100%" style={{stopColor: '#4f46e5', stopOpacity: 1}} />
            </linearGradient>
        </defs>
        <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="url(#logoGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 7L12 12L22 7" stroke="url(#logoGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 22V12" stroke="url(#logoGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
