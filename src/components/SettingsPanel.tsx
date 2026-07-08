import React, { useState, useRef } from 'react';
import { Settings, Upload, Trash2, Key, FileText, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { parsePdf } from '../utils/pdfParser';
import type { LLMConfig } from '../utils/llm';

interface SettingsPanelProps {
  config: LLMConfig;
  onChangeConfig: (config: LLMConfig) => void;
  contextCVs: { name: string; text: string }[];
  onAddCV: (name: string, text: string) => void;
  onRemoveCV: (index: number) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
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
  onToggleCollapse
}) => {
  const [parsingFile, setParsingFile] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value as LLMConfig['provider'];
    onChangeConfig({
      ...config,
      provider,
      model: PROVIDER_MODELS[provider][0]
    });
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeConfig({
      ...config,
      model: e.target.value
    });
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeConfig({
      ...config,
      apiKey: e.target.value
    });
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

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Collapse/Expand Toggle Button */}
      <button
        type="button"
        className="sidebar-toggle-btn"
        onClick={onToggleCollapse}
        title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="sidebar-scroll-area">
        {/* COLLAPSED VIEW (Icon-Only Mode) */}
        {collapsed ? (
        <div className="collapsed-icon-only" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '2.5rem', alignItems: 'center' }}>
          <div title="LLM Configurations" className="flex-row-gap" style={{ cursor: 'pointer', position: 'relative' }} onClick={onToggleCollapse}>
            <Settings size={24} className="text-accent-primary" />
            {config.apiKey && (
              <span style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-secondary)' }}></span>
            )}
          </div>

          <hr style={{ width: '30px', borderColor: 'var(--card-border)' }} />

          <div 
            title={parsingFile ? "Parsing document..." : "Upload CVs (.pdf, .txt, .md)"} 
            style={{ cursor: 'pointer', position: 'relative' }}
            onClick={triggerFileInput}
          >
            <Upload size={24} style={{ color: parsingFile ? 'var(--warning)' : 'var(--accent-accent)' }} />
          </div>

          <div title={`${contextCVs.length} CV Profile(s) Loaded`} className="flex-row-gap" style={{ cursor: 'pointer', position: 'relative' }} onClick={onToggleCollapse}>
            <Layers size={24} style={{ color: 'var(--text-secondary)' }} />
            {contextCVs.length > 0 && (
              <span style={{ position: 'absolute', top: -6, right: -8, minWidth: '16px', height: '16px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#ffffff', fontSize: '0.65rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', padding: '0 2px' }}>
                {contextCVs.length}
              </span>
            )}
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
        /* EXPANDED VIEW (Standard Full Sidebar) */
        <div className="collapsed-hidden" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
          <div>
            <div className="flex-row-gap" style={{ marginBottom: '1.25rem', marginTop: '0.5rem' }}>
              <Settings size={20} className="text-accent-primary" />
              <h2 style={{ fontSize: '1.1rem' }}>LLM Configuration</h2>
            </div>

            <div className="form-group">
              <label htmlFor="llm-provider">Provider</label>
              <select
                id="llm-provider"
                value={config.provider}
                onChange={handleProviderChange}
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
                value={config.model}
                onChange={handleModelChange}
              >
                {PROVIDER_MODELS[config.provider].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="llm-api-key" className="flex-row-between">
                <span>API Key</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.7 }} className="flex-row-gap">
                  <Key size={10} /> Local only
                </span>
              </label>
              <input
                id="llm-api-key"
                type="password"
                placeholder={`Enter ${config.provider === 'gemini' ? 'Gemini' : config.provider === 'openai' ? 'OpenAI' : 'Anthropic'} key`}
                value={config.apiKey}
                onChange={handleApiKeyChange}
              />
            </div>

            {config.provider !== 'gemini' && (
              <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '0.5rem', display: 'flex', gap: '0.25rem', alignItems: 'flex-start' }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  OpenAI & Anthropic block direct browser API requests (CORS). Use Gemini for seamless client-side execution.
                </span>
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
            CV Customizer v1.2.0
          </div>
        </div>
        )}
      </div>
    </aside>
  );
};
