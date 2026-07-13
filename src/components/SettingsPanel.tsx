import React, { useState, useRef, useEffect } from 'react';
import { Settings, Upload, Trash2, FileText, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Layers, LogOut, ShieldCheck, Zap } from 'lucide-react';
import { parsePdf } from '../utils/pdfParser';
import type { LLMConfig } from '../utils/llm';
import { saveUserAPIKey, deleteUserAPIKey, getSavedAPIKeysStatus } from '../utils/llm';

interface SettingsPanelProps {
  config: LLMConfig;
  onChangeConfig: (config: LLMConfig) => void;
  contextCVs: { name: string; text: string }[];
  onAddCV: (name: string, text: string) => void;
  onRemoveCV: (index: number) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  userProfile: { email: string; full_name?: string; plan: 'free' | 'byok' | 'pro'; generation_count: number } | null;
  onLogout: () => void;
}

const PROVIDER_MODELS = {
  gemini: ['gemini-3.5-flash', 'gemini-3.5-pro', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o1-mini'],
  anthropic: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-20240229']
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  config,
  onChangeConfig,
  contextCVs,
  onAddCV,
  onRemoveCV,
  collapsed,
  onToggleCollapse,
  userProfile,
  onLogout
}) => {
  const [parsingFile, setParsingFile] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [savedKeys, setSavedKeys] = useState<{ gemini: boolean; openai: boolean; anthropic: boolean }>({
    gemini: false,
    openai: false,
    anthropic: false
  });
  const [savingKey, setSavingKey] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch status of saved keys for BYOK users
  useEffect(() => {
    if (userProfile && userProfile.plan === 'byok') {
      getSavedAPIKeysStatus().then(setSavedKeys);
    }
  }, [userProfile, config.provider]);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value as LLMConfig['provider'];
    onChangeConfig({
      ...config,
      provider,
      model: PROVIDER_MODELS[provider][0],
      apiKey: '' // Reset local apiKey since it's now server-managed
    });
    setKeyInput('');
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
      await saveUserAPIKey(config.provider, keyInput);
      setSavedKeys(prev => ({ ...prev, [config.provider]: true }));
      setKeyInput('');
      setSuccessMsg(`API Key for ${config.provider} saved securely.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save API key.');
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
      setSavedKeys(prev => ({ ...prev, [config.provider]: false }));
      setSuccessMsg(`API Key for ${config.provider} deleted.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete API key.');
    } finally {
      setSavingKey(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMsg('');
    setSuccessMsg('');
    setParsingFile(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        let text = '';
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          const arrayBuffer = await file.arrayBuffer();
          text = await parsePdf(arrayBuffer);
        } else if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
          text = await file.text();
        } else {
          throw new Error('Unsupported file type. Please upload PDF, TXT, or Markdown files.');
        }

        if (!text.trim()) {
          throw new Error('Extracted text is empty. Ensure the file contains readable text.');
        }

        onAddCV(file.name, text);
        setSuccessMsg(`Successfully parsed ${file.name}!`);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || `Failed to parse ${file.name}`);
      }
    }

    setParsingFile(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const isCurrentKeySaved = savedKeys[config.provider];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <button
        type="button"
        className="sidebar-toggle-btn"
        onClick={onToggleCollapse}
        title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="sidebar-scroll-area">
        {collapsed ? (
          <div className="collapsed-icon-only" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '2.5rem', alignItems: 'center' }}>
            <div title="LLM Configurations" style={{ cursor: 'pointer' }} onClick={onToggleCollapse}>
              <Settings size={24} className="text-accent-primary" />
            </div>

            <hr style={{ width: '30px', borderColor: 'var(--card-border)' }} />

            <div 
              title={parsingFile ? "Parsing document..." : "Upload CVs (.pdf, .txt, .md)"} 
              style={{ cursor: 'pointer' }}
              onClick={triggerFileInput}
            >
              <Upload size={24} style={{ color: parsingFile ? 'var(--warning)' : 'var(--accent-accent)' }} />
            </div>

            <div title={`${contextCVs.length} CV Profile(s) Loaded`} style={{ cursor: 'pointer', position: 'relative' }} onClick={onToggleCollapse}>
              <Layers size={24} style={{ color: 'var(--text-secondary)' }} />
              {contextCVs.length > 0 && (
                <span style={{ position: 'absolute', top: -6, right: -8, minWidth: '16px', height: '16px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#ffffff', fontSize: '0.65rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px' }}>
                  {contextCVs.length}
                </span>
              )}
            </div>

            <hr style={{ width: '30px', borderColor: 'var(--card-border)' }} />

            <div title="Sign Out" style={{ cursor: 'pointer', color: 'var(--danger)' }} onClick={onLogout}>
              <LogOut size={22} />
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.txt,.md"
              multiple
              style={{ display: 'none' }}
            />
          </div>
        ) : (
          <div className="collapsed-hidden" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
            
            {/* User Profile Info */}
            {userProfile && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: 'var(--border-radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
                    {(userProfile.full_name || userProfile.email)[0].toUpperCase()}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {userProfile.full_name || 'User'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {userProfile.email}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Plan Tier:</span>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    color: userProfile.plan === 'pro' ? 'var(--accent-mint)' : userProfile.plan === 'byok' ? 'var(--accent-primary)' : 'var(--text-primary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    {userProfile.plan === 'pro' ? <Zap size={10} /> : <ShieldCheck size={10} />}
                    {userProfile.plan.toUpperCase()}
                  </span>
                </div>

                {userProfile.plan === 'free' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Free Generations:</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {userProfile.generation_count} / 3
                    </span>
                  </div>
                )}

                <button 
                  type="button" 
                  onClick={onLogout}
                  className="btn" 
                  style={{ display: 'flex', width: '100%', padding: '0.4rem', justifyContent: 'center', alignItems: 'center', gap: '0.35rem', background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.25rem' }}
                >
                  <LogOut size={12} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}

            <div>
              <div className="flex-row-gap" style={{ marginBottom: '1.25rem', marginTop: '0.5rem' }}>
                <Settings size={20} className="text-accent-primary" />
                <h2 style={{ fontSize: '1.1rem' }}>LLM Configuration</h2>
              </div>

              <div className="form-group">
                <label htmlFor="llm-provider">Provider</label>
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
                <label htmlFor="llm-model">Model</label>
                <select
                  id="llm-model"
                  value={userProfile?.plan === 'free' ? 'gemini-3.5-flash' : config.model}
                  onChange={handleModelChange}
                  disabled={userProfile?.plan === 'free'}
                >
                  {userProfile?.plan === 'free' ? (
                    <option value="gemini-3.5-flash">gemini-3.5-flash</option>
                  ) : (
                    PROVIDER_MODELS[config.provider].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))
                  )}
                </select>
                {userProfile?.plan === 'free' && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginTop: '0.4rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    <ShieldCheck size={12} />
                    <span>Free plan is locked to Gemini 3.5 Flash.</span>
                  </div>
                )}
              </div>

              {/* API Key management based on plan */}
              {userProfile && userProfile.plan === 'byok' ? (
                <div className="form-group">
                  <label htmlFor="llm-api-key" className="flex-row-between">
                    <span>API Key (BYOK)</span>
                    {isCurrentKeySaved && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-mint)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <CheckCircle2 size={10} /> Saved
                      </span>
                    )}
                  </label>
                  {isCurrentKeySaved ? (
                    <button
                      type="button"
                      onClick={handleDeleteKey}
                      disabled={savingKey}
                      className="btn"
                      style={{ width: '100%', padding: '0.5rem', background: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.2)', color: 'var(--danger)', fontSize: '0.85rem' }}
                    >
                      Delete Saved Key
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        id="llm-api-key"
                        type="password"
                        placeholder={`Enter ${config.provider} key`}
                        value={keyInput}
                        onChange={(e) => setKeyInput(e.target.value)}
                        style={{ flexGrow: 1 }}
                      />
                      <button
                        type="button"
                        onClick={handleSaveKey}
                        disabled={savingKey || !keyInput.trim()}
                        className="btn btn-primary"
                        style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}
                      >
                        {savingKey ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', background: 'rgba(52, 199, 89, 0.05)', border: '1px solid rgba(52, 199, 89, 0.15)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', color: 'var(--accent-mint)', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <ShieldCheck size={16} style={{ flexShrink: 0 }} />
                  <span>Managed API Key (No setup needed)</span>
                </div>
              )}
            </div>

            <hr style={{ borderColor: 'var(--card-border)' }} />

            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '1rem' }}>
              <div className="flex-row-gap">
                <FileText size={20} className="text-accent-primary" />
                <h2 style={{ fontSize: '1.1rem' }}>Your Profiles / CVs</h2>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Upload resumes. The LLM merges them to extract career evidence for the target job. 
                <strong> (Plan limit: Max {userProfile?.plan === 'free' ? '1' : '5'} CVs)</strong>.
              </p>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.txt,.md"
                multiple
                style={{ display: 'none' }}
              />

              <div className="file-upload-zone" onClick={triggerFileInput}>
                <Upload size={22} style={{ margin: '0 auto 0.5rem', color: 'var(--accent-primary)' }} />
                <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  {parsingFile ? 'Parsing document...' : 'Upload CVs'}
                </p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  PDF, TXT, MD files
                </p>
              </div>

              {errorMsg && (
                <div className="flex-row-gap" style={{ color: 'var(--danger)', fontSize: '0.75rem', background: 'rgba(255, 59, 48, 0.08)', padding: '0.5rem', borderRadius: '4px' }}>
                  <AlertCircle size={12} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="flex-row-gap" style={{ color: 'var(--accent-secondary)', fontSize: '0.75rem', background: 'rgba(52, 199, 89, 0.08)', padding: '0.5rem', borderRadius: '4px' }}>
                  <CheckCircle2 size={12} style={{ flexShrink: 0 }} />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="cv-badge-list" style={{ marginTop: '0.25rem' }}>
                {contextCVs.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                    No CVs uploaded yet
                  </p>
                ) : (
                  contextCVs.map((cv, index) => (
                    <div key={index} className="cv-badge">
                      <span className="cv-badge-name" title={cv.name}>{cv.name}</span>
                      <button
                        type="button"
                        className="cv-badge-remove"
                        onClick={() => onRemoveCV(index)}
                        title="Remove CV"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 'auto' }}>
              CV Customizer v2.0.0
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
