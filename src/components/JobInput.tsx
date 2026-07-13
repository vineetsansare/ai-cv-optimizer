import React from 'react';
import { ArrowRight, Briefcase, Target, AlertCircle, FileText, FileDown } from 'lucide-react';
import type { LLMConfig, TargetLength } from '../utils/llm';

interface JobInputProps {
  jobDescription: string;
  onChangeJobDescription: (jd: string) => void;
  aspirations: string;
  onChangeAspirations: (asp: string) => void;
  targetLength: TargetLength;
  onChangeTargetLength: (len: TargetLength) => void;
  config: LLMConfig;
  contextCVs: { name: string; text: string }[];
  activeCVIndices: number[];
  onToggleCVIndex: (index: number) => void;
  onGenerate: () => void;
  generating: boolean;
  isKeyConfigured: boolean;
}

export const JobInput: React.FC<JobInputProps> = ({
  jobDescription,
  onChangeJobDescription,
  aspirations,
  onChangeAspirations,
  targetLength,
  onChangeTargetLength,
  config: _config,
  contextCVs,
  activeCVIndices,
  onToggleCVIndex,
  onGenerate,
  generating,
  isKeyConfigured
}) => {
  const isKeyMissing = !isKeyConfigured;
  const isCVMissing = contextCVs.length === 0;
  const isJDMissing = !jobDescription.trim();
  const isCVSelectedMissing = activeCVIndices.length === 0;
  const canGenerate = !isKeyMissing && !isCVMissing && !isJDMissing && !isCVSelectedMissing && !generating;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canGenerate) {
      onGenerate();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If command+enter or ctrl+enter is pressed, trigger generation
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (canGenerate) {
        onGenerate();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="glass-card-header">
        <div className="flex-row-gap">
          <Briefcase size={20} className="text-accent-mint" />
          <h3 style={{ margin: 0 }}>Target Job & Customization Focus</h3>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="job-description" className="flex-row-between">
          <span>Paste Job Description (JD) *</span>
          <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Ctrl+Enter / Cmd+Enter to generate</span>
        </label>
        <textarea
          id="job-description"
          placeholder="Paste the complete job description of the role you are applying to. This helps the AI extract key skills, keywords, and responsibilities to optimize your resume."
          value={jobDescription}
          onChange={(e) => onChangeJobDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ minHeight: '160px' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        <div className="form-group">
          <label htmlFor="aspirations" className="flex-row-gap">
            <Target size={14} className="text-accent-mint" />
            <span>Future Aspirations / Focus (Optional)</span>
          </label>
          <input
            id="aspirations"
            type="text"
            placeholder="e.g. Focus on Tech Lead aspects; prioritize React stack."
            value={aspirations}
            onChange={(e) => onChangeAspirations(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="target-length" className="flex-row-gap">
            <FileDown size={14} className="text-accent-mint" />
            <span>Output Format & Length</span>
          </label>
          <select
            id="target-length"
            value={targetLength}
            onChange={(e) => onChangeTargetLength(e.target.value as TargetLength)}
            style={{
              padding: '0.65rem 1rem',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--card-border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="1-page">1-Page Resume (Aggressive truncation)</option>
            <option value="2-page">2-Page Resume (Standard formatting)</option>
            <option value="comprehensive">Comprehensive CV (Exhaustive history)</option>
          </select>
        </div>
      </div>

      {contextCVs.length > 0 && (
        <div className="form-group">
          <label className="flex-row-gap">
            <FileText size={14} className="text-accent-mint" />
            <span>Select Context CVs to Include *</span>
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.25rem' }}>
            {contextCVs.map((cv, index) => {
              const isActive = activeCVIndices.includes(index);
              return (
                <label
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.8rem',
                    background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'rgba(17, 24, 39, 0.4)',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--accent-primary)' : 'var(--card-border)',
                    borderRadius: '999px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    transition: 'all 0.2s'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={() => onToggleCVIndex(index)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>{cv.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Warnings helper */}
      {(isKeyMissing || isCVMissing || isJDMissing || (contextCVs.length > 0 && isCVSelectedMissing)) && (
        <div style={{ padding: '0.75rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--warning)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div className="flex-row-gap" style={{ fontWeight: 600 }}>
            <AlertCircle size={16} />
            <span>Setup Checklist:</span>
          </div>
          <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
            {isKeyMissing && <li>Provide an API key in the settings panel (left sidebar).</li>}
            {isCVMissing && <li>Upload at least one CV profile in the settings panel (left sidebar).</li>}
            {!isCVMissing && isCVSelectedMissing && <li>Select at least one CV from the context checkboxes above.</li>}
            {isJDMissing && <li>Paste the target Job Description in the box above.</li>}
          </ul>
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={!canGenerate}
        style={{ fontSize: '1.05rem', padding: '0.9rem' }}
      >
        {generating ? (
          'Generating Optimized CV...'
        ) : (
          <>
            <span>Customize CV for Job</span>
            <ArrowRight size={18} />
          </>
        )}
      </button>
    </form>
  );
};
