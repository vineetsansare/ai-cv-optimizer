import React from 'react';

interface AuroraBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  intensity?: 'subtle' | 'vibrant';
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({
  children,
  className = '',
  intensity = 'subtle'
}) => {
  return (
    <div className={`aurora-wrapper ${className}`}>
      {/* Dynamic ambient background blobs */}
      <div className={`aurora-container ${intensity}`}>
        <div className="aurora-blob blob-indigo" />
        <div className="aurora-blob blob-violet" />
        <div className="aurora-blob blob-cyan" />
        <div className="aurora-blob blob-glow" />
        <div className="aurora-grid-overlay" />
        <div className="aurora-noise-overlay" />
      </div>

      {/* Content Canvas */}
      <div className="aurora-content">
        {children}
      </div>
    </div>
  );
};
