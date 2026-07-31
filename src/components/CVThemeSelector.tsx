import React from 'react';
import { Palette, User, Check } from 'lucide-react';

export interface CVThemeConfig {
  accentColor: string;
  themeName: string;
  showPhoto: boolean;
  photoUrl?: string;
}

export const ACCENT_THEMES = [
  { id: 'charcoal', name: 'Slate Charcoal', color: '#475569', bg: 'rgba(71, 85, 105, 0.15)' },
  { id: 'violet', name: 'Executive Violet', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.15)' },
  { id: 'blue', name: 'Sapphire Blue', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.15)' },
  { id: 'teal', name: 'Emerald Teal', color: '#059669', bg: 'rgba(5, 150, 105, 0.15)' },
  { id: 'rose', name: 'Creative Rose', color: '#e11d48', bg: 'rgba(225, 29, 72, 0.15)' }
];

interface CVThemeSelectorProps {
  themeConfig: CVThemeConfig;
  onChangeThemeConfig: (config: CVThemeConfig) => void;
  userAvatarUrl?: string;
}

export const CVThemeSelector: React.FC<CVThemeSelectorProps> = ({
  themeConfig,
  onChangeThemeConfig,
  userAvatarUrl
}) => {
  const [photoInput, setPhotoInput] = React.useState(themeConfig.photoUrl || userAvatarUrl || '');

  const handleSelectColor = (color: string, name: string) => {
    onChangeThemeConfig({
      ...themeConfig,
      accentColor: color,
      themeName: name
    });
  };

  const handleTogglePhoto = () => {
    const nextState = !themeConfig.showPhoto;
    onChangeThemeConfig({
      ...themeConfig,
      showPhoto: nextState,
      photoUrl: photoInput || userAvatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    });
  };

  const handlePhotoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setPhotoInput(url);
    if (themeConfig.showPhoto) {
      onChangeThemeConfig({
        ...themeConfig,
        photoUrl: url
      });
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '1.25rem',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.85rem 1.25rem',
      background: 'var(--card-bg)',
      border: '1px solid var(--card-border)',
      borderRadius: '16px',
      marginBottom: '1.25rem'
    }} className="no-print">
      
      {/* Left: Accent Color Themes */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
          <Palette size={16} style={{ color: themeConfig.accentColor }} />
          <span>CV Accent Theme:</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {ACCENT_THEMES.map((theme) => {
            const isSelected = themeConfig.accentColor === theme.color;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleSelectColor(theme.color, theme.name)}
                title={theme.name}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: theme.color,
                  border: isSelected ? '2px solid #ffffff' : '2px solid transparent',
                  boxShadow: isSelected ? `0 0 0 2px ${theme.color}` : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  transition: 'transform 0.15s ease'
                }}
              >
                {isSelected && <Check size={14} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Candidate Photo Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={themeConfig.showPhoto}
            onChange={handleTogglePhoto}
            style={{ width: '16px', height: '16px', accentColor: themeConfig.accentColor }}
          />
          <User size={16} style={{ color: themeConfig.accentColor }} />
          <span>Include Candidate Photo</span>
        </label>

        {themeConfig.showPhoto && (
          <input
            type="text"
            placeholder="Image URL (e.g. https://...)"
            value={photoInput}
            onChange={handlePhotoUrlChange}
            style={{
              fontSize: '0.8rem',
              padding: '0.35rem 0.65rem',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              width: '200px'
            }}
          />
        )}
      </div>

    </div>
  );
};
