import React from 'react';
import { ParticlesCanvas } from './ParticlesCanvas';

interface AuroraBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  intensity?: 'subtle' | 'vibrant';
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({
  children,
  className = '',
  intensity = 'vibrant'
}) => {
  return (
    <div className={`aurora-wrapper ${className}`}>
      {/* 60fps Floating Ambient Particles Layer */}
      <ParticlesCanvas />

      {/* Dynamic ambient background mesh blobs */}
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
