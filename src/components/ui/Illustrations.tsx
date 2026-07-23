import React from 'react';

export const UploadIllustration: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 80, className = '', style }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <defs>
      <linearGradient id="up_grad1" x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3b82f6" />
        <stop offset="1" stopColor="#8b5cf6" />
      </linearGradient>
      <linearGradient id="up_grad2" x1="40" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
        <stop stopColor="#60a5fa" stopOpacity="0.8" />
        <stop offset="1" stopColor="#c084fc" stopOpacity="0.3" />
      </linearGradient>
      <filter id="up_shadow" x="10" y="25" width="100" height="85" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#3b82f6" floodOpacity="0.25" />
      </filter>
    </defs>
    <rect x="25" y="30" width="70" height="75" rx="14" fill="url(#up_grad2)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" filter="url(#up_shadow)" />
    <rect x="35" y="45" width="30" height="4" rx="2" fill="#ffffff" fillOpacity="0.9" />
    <rect x="35" y="55" width="50" height="4" rx="2" fill="#ffffff" fillOpacity="0.6" />
    <rect x="35" y="65" width="40" height="4" rx="2" fill="#ffffff" fillOpacity="0.6" />
    <rect x="35" y="75" width="45" height="4" rx="2" fill="#ffffff" fillOpacity="0.4" />
    {/* Floating Arrow Circle */}
    <circle cx="82" cy="35" r="20" fill="url(#up_grad1)" stroke="#ffffff" strokeWidth="2.5" />
    <path d="M82 43V27M82 27L76 33M82 27L88 33" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const AICoachIllustration: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 80, className = '', style }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <defs>
      <linearGradient id="ai_grad1" x1="10" y1="10" x2="110" y2="110" gradientUnits="userSpaceOnUse">
        <stop stopColor="#8b5cf6" />
        <stop offset="1" stopColor="#ec4899" />
      </linearGradient>
      <filter id="ai_glow" x="15" y="15" width="90" height="90" filterUnits="userSpaceOnUse">
        <feGaussianBlur stdDeviation="8" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    {/* Central Sparkle Orbit */}
    <circle cx="60" cy="60" r="35" stroke="url(#ai_grad1)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" opacity="0.6" />
    <circle cx="60" cy="60" r="22" fill="url(#ai_grad1)" fillOpacity="0.15" />
    {/* Main Diamond Sparkle */}
    <g filter="url(#ai_glow)">
      <path d="M60 25C60 40 45 60 25 60C45 60 60 80 60 95C60 80 75 60 95 60C75 60 60 40 60 25Z" fill="url(#ai_grad1)" />
    </g>
    <circle cx="35" cy="35" r="4" fill="#60a5fa" />
    <circle cx="85" cy="80" r="5" fill="#f472b6" />
  </svg>
);

export const ATSReportIllustration: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 80, className = '', style }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <defs>
      <linearGradient id="ats_grad1" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10b981" />
        <stop offset="1" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    {/* Circular Gauge */}
    <circle cx="60" cy="60" r="40" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
    <circle cx="60" cy="60" r="40" stroke="url(#ats_grad1)" strokeWidth="8" strokeDasharray="251" strokeDashoffset="50" strokeLinecap="round" fill="none" transform="rotate(-90 60 60)" />
    {/* Center Checkmark */}
    <circle cx="60" cy="60" r="26" fill="#10b981" fillOpacity="0.2" />
    <path d="M48 60L56 68L74 50" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const EmptyStateIllustration: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 100, className = '', style }) => (
  <svg width={size} height={size} viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <defs>
      <linearGradient id="emp_grad" x1="20" y1="20" x2="120" y2="120" gradientUnits="userSpaceOnUse">
        <stop stopColor="#64748b" stopOpacity="0.4" />
        <stop offset="1" stopColor="#94a3b8" stopOpacity="0.1" />
      </linearGradient>
    </defs>
    <rect x="35" y="30" width="70" height="85" rx="12" fill="url(#emp_grad)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
    <circle cx="70" cy="65" r="16" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeDasharray="3 3" fill="none" />
    <path d="M70 59V71M64 65H76" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
    <rect x="48" y="90" width="44" height="4" rx="2" fill="rgba(255,255,255,0.3)" />
    <rect x="55" y="98" width="30" height="4" rx="2" fill="rgba(255,255,255,0.2)" />
  </svg>
);
