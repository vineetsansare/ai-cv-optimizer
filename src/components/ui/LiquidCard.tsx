import React from 'react';

interface LiquidCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'glass' | 'elevated' | 'solid' | 'translucent' | 'glowing';
  hoverEffect?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

export const LiquidCard: React.FC<LiquidCardProps> = ({
  children,
  variant = 'glass',
  hoverEffect = false,
  padding = 'md',
  className = '',
  style = {},
  ...rest
}) => {
  const paddingClass = padding === 'none' ? 'p-0' : `p-${padding}`;
  const hoverClass = hoverEffect ? 'liquid-card-hover' : '';

  return (
    <div
      className={`liquid-card liquid-card-${variant} ${paddingClass} ${hoverClass} ${className}`}
      style={style}
      {...rest}
    >
      <div className="liquid-card-glass-shine" />
      <div className="liquid-card-inner">
        {children}
      </div>
    </div>
  );
};
