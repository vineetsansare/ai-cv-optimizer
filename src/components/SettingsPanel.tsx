import React, { useState, useEffect, useRef } from 'react';
import { Settings, ShieldCheck, Zap, LogOut, CheckCircle2, Info, Camera } from 'lucide-react';
import type { LLMConfig } from '../utils/llm';
import { saveUserAPIKey, deleteUserAPIKey, getSavedAPIKeysStatus } from '../utils/llm';
import { AvatarCropperModal } from './AvatarCropperModal';

interface SettingsPanelProps {
  config: LLMConfig;
  onChangeConfig: (config: LLMConfig) => void;
  userProfile: { email: string; full_name?: string; plan: 'free' | 'byok' | 'pro'; generation_count: number; avatar_url?: string } | null;
  onLogout: () => void;
  onUpdateAvatar?: (avatarUrl: string) => Promise<void>;
}

const PROVIDER_MODELS = {
  gemini: ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-pro'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini', 'o3-mini'],
  anthropic: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-20240229']
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  config,
  onChangeConfig,
  userProfile,
  onLogout,
  onUpdateAvatar
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [savedKeys, setSavedKeys] = useState<{ gemini: boolean; openai: boolean; anthropic: boolean }>({
    gemini: false,
    openai: false,
    anthropic: false
  });
  const [savingKey, setSavingKey] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Avatar Upload States
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = '';

    // Enforce 2MB size limit ceiling
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 2MB limit. Please select a smaller photo.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPEG, WEBP).');
      return;
    }

    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCropSave = async (croppedDataUrl: string) => {
    setCropImageSrc(null);
    if (!onUpdateAvatar) return;

    setUploadingAvatar(true);
    setErrorMsg('');
    try {
      await onUpdateAvatar(croppedDataUrl);
      setSuccessMsg('Profile avatar updated successfully!');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to update avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    if (userProfile?.plan === 'byok') {
      fetchKeysStatus();
    }
  }, [userProfile, config.provider]);

  const fetchKeysStatus = async () => {
    try {
      const status = await getSavedAPIKeysStatus();
      setSavedKeys(status);
    } catch (err) {
      console.error('Failed to fetch keys status:', err);
    }
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value as 'gemini' | 'openai' | 'anthropic';
    const defaultModel = PROVIDER_MODELS[provider][0];
    onChangeConfig({
      ...config,
      provider,
      model: defaultModel
    });
    setKeyInput('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeConfig({
      ...config,
      model: e.target.value
    });
  };

  const handleSaveKey = async () => {
    if (!keyInput.trim()) return;
    setSavingKey(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await saveUserAPIKey(config.provider, keyInput.trim());
      setSuccessMsg(`Successfully saved API key for ${config.provider.toUpperCase()}!`);
      setKeyInput('');
      fetchKeysStatus();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save API key');
    } finally {
      setSavingKey(false);
    }
  };

  const handleDeleteKey = async () => {
    setSavingKey(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await deleteUserAPIKey(config.provider);
      setSuccessMsg(`Deleted saved API key for ${config.provider.toUpperCase()}`);
      fetchKeysStatus();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to delete API key');
    } finally {
      setSavingKey(false);
    }
  };

  const isCurrentKeySaved = savedKeys[config.provider];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }} className="entrance-fade">
      
      {/* Column 1: Profile & Plan */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'fit-content' }}>
        <div className="glass-card-header" style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem', marginBottom: 0 }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Profile & Billing</h3>
        </div>

        {userProfile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Profile Avatar Card */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
                {userProfile.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt={userProfile.full_name || 'Profile Avatar'}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--accent-primary)',
                      boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    color: '#fff'
                  }}>
                    {(userProfile.full_name || userProfile.email)[0].toUpperCase()}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--accent-primary)',
                    border: '2px solid var(--card-bg)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title="Upload profile picture"
                >
                  <Camera size={12} />
                </button>
              </div>

              <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {userProfile.full_name || 'User'}
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 0.35rem 0' }}>
                  {userProfile.email}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="file"
                    ref={avatarInputRef}
                    onChange={handleAvatarFileSelect}
                    accept="image/png,image/jpeg,image/webp"
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-primary)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      padding: 0,
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    {uploadingAvatar ? 'Uploading...' : userProfile.avatar_url ? 'Change Avatar' : 'Upload Avatar'}
                  </button>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>• Max 2MB</span>
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--card-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Subscription Plan:</span>
                <span style={{ 
                  fontSize: '0.85rem', 
                  fontWeight: 700, 
                  color: userProfile.plan === 'pro' ? 'var(--accent-secondary)' : userProfile.plan === 'byok' ? 'var(--accent-primary)' : 'var(--text-primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  {userProfile.plan === 'pro' ? <Zap size={12} /> : <ShieldCheck size={12} />}
                  {userProfile.plan.toUpperCase()}
                </span>
              </div>

              {userProfile.plan === 'free' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Free Generations Used:</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {userProfile.generation_count} / 3
                  </span>
                </div>
              )}
            </div>

            <button 
              type="button" 
              onClick={onLogout}
              className="btn btn-secondary" 
              style={{ display: 'flex', width: '100%', padding: '0.75rem', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', border: '1px solid rgba(186, 26, 26, 0.2)' }}
            >
              <LogOut size={16} />
              <span>Log Out of Workspace</span>
            </button>
          </div>
        )}
      </div>

      {/* Column 2: LLM Config & Secure Key Vault */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass-card-header" style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem', marginBottom: 0 }}>
          <div className="flex-row-gap">
            <Settings size={20} className="text-accent-primary" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>LLM Engine Setup</h3>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="llm-provider">Active Provider</label>
            <select
              id="llm-provider"
              value={userProfile?.plan === 'free' ? 'gemini' : config.provider}
              onChange={handleProviderChange}
              disabled={userProfile?.plan === 'free'}
            >
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="llm-model">Default Generation Model</label>
            <select
              id="llm-model"
              value={userProfile?.plan === 'free' ? 'gemini-1.5-flash' : config.model}
              onChange={handleModelChange}
              disabled={userProfile?.plan === 'free'}
            >
              {userProfile?.plan === 'free' ? (
                <option value="gemini-1.5-flash">gemini-1.5-flash</option>
              ) : (
                PROVIDER_MODELS[config.provider].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))
              )}
            </select>
            {userProfile?.plan === 'free' && (
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginTop: '0.25rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                <Info size={14} />
                <span>Free trial is locked to Gemini 1.5 Flash. Upgrade or go BYOK to select others.</span>
              </div>
            )}
          </div>

          <hr style={{ borderColor: 'var(--card-border)' }} />

          {/* Key Vault Management */}
          {userProfile && userProfile.plan === 'byok' ? (
            <div className="form-group">
              <label htmlFor="llm-api-key" className="flex-row-between">
                <span>BYOK Secure Key Vault</span>
                {isCurrentKeySaved && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-mint)', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>
                    <CheckCircle2 size={12} style={{ color: '#10b981' }} /> Key Active
                  </span>
                )}
              </label>

              {isCurrentKeySaved ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '0.5rem', borderRadius: '4px' }}>
                    An encrypted key for {config.provider.toUpperCase()} is active on the server.
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteKey}
                    disabled={savingKey}
                    className="btn btn-secondary"
                    style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
                  >
                    Remove Saved Key
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    id="llm-api-key"
                    type="password"
                    placeholder={`Enter your secure ${config.provider.toUpperCase()} key`}
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    style={{ flexGrow: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveKey}
                    disabled={savingKey || !keyInput.trim()}
                    className="btn btn-primary"
                    style={{ width: 'auto', padding: '0 1.25rem' }}
                  >
                    {savingKey ? 'Storing...' : 'Store'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: '0.85rem', background: 'rgba(37, 99, 235, 0.05)', border: '1px solid rgba(37, 99, 235, 0.15)', padding: '0.75rem', borderRadius: 'var(--border-radius-md)', color: 'var(--accent-primary)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <ShieldCheck size={18} style={{ flexShrink: 0 }} />
              <span>SaaS Managed Key Active (No setup required)</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex-row-gap" style={{ color: 'var(--danger)', fontSize: '0.8rem', background: 'rgba(186, 26, 26, 0.08)', padding: '0.75rem', borderRadius: 'var(--border-radius-md)' }}>
              <Info size={14} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex-row-gap" style={{ color: '#10b981', fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.08)', padding: '0.75rem', borderRadius: 'var(--border-radius-md)' }}>
              <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}
        </div>
      </div>

      {cropImageSrc && (
        <AvatarCropperModal
          imageSrc={cropImageSrc}
          onClose={() => setCropImageSrc(null)}
          onCropComplete={handleCropSave}
        />
      )}

    </div>
  );
};
