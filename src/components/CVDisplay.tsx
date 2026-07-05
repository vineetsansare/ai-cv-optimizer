import React, { useState, useEffect } from 'react';
import { Eye, FileEdit, BarChart3, Sparkles, Printer, Copy, Check, Mail } from 'lucide-react';
import type { CVGenerationResult } from '../utils/llm';
import { parseMarkdownToHtml, stripMarkdown } from '../utils/mdParser';

interface CVDisplayProps {
  result: CVGenerationResult;
  onUpdateMarkdown: (markdown: string) => void;
}

type TabType = 'preview' | 'editor' | 'ats' | 'tweaks' | 'cover';

export const CVDisplay: React.FC<CVDisplayProps> = ({ result, onUpdateMarkdown }) => {
  const [activeTab, setActiveTab] = useState<TabType>('preview');
  const [copied, setCopied] = useState<'markdown' | 'text' | 'cover' | null>(null);
  
  // Reset active tab to preview whenever a new result is generated
  useEffect(() => {
    setActiveTab('preview');
  }, [result.cvMarkdown]);

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(result.cvMarkdown);
    setCopied('markdown');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyPlainText = () => {
    const plainText = stripMarkdown(result.cvMarkdown);
    navigator.clipboard.writeText(plainText);
    setCopied('text');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopyCoverLetter = () => {
    navigator.clipboard.writeText(result.coverLetter || '');
    setCopied('cover');
    setTimeout(() => setCopied(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper to calculate circular stroke values
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (result.atsScore / 100) * circumference;

  // Class for score color
  const getScoreColorClass = (score: number) => {
    if (score >= 80) return 'score-high';
    if (score >= 50) return 'score-medium';
    return 'score-low';
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 80) return 'var(--accent-secondary)';
    if (score >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div className="glass-card cv-display-card" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <div className="glass-card-header cv-display-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div className="tabs-container" style={{ margin: 0, borderBottom: 'none', padding: 0, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`tab ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            <span className="flex-row-gap" style={{ gap: '0.4rem' }}>
              <Eye size={16} /> Preview
            </span>
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            <span className="flex-row-gap" style={{ gap: '0.4rem' }}>
              <FileEdit size={16} /> Edit Markdown
            </span>
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'ats' ? 'active' : ''}`}
            onClick={() => setActiveTab('ats')}
          >
            <span className="flex-row-gap" style={{ gap: '0.4rem' }}>
              <BarChart3 size={16} /> ATS Analysis ({result.atsScore}%)
            </span>
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'tweaks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tweaks')}
          >
            <span className="flex-row-gap" style={{ gap: '0.4rem' }}>
              <Sparkles size={16} /> Human Adjustments
            </span>
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'cover' ? 'active' : ''}`}
            onClick={() => setActiveTab('cover')}
          >
            <span className="flex-row-gap" style={{ gap: '0.4rem' }}>
              <Mail size={16} /> Cover Letter
            </span>
          </button>
        </div>

        <div className="flex-row-gap" style={{ gap: '0.5rem', marginLeft: 'auto' }}>
          {activeTab === 'cover' ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCopyCoverLetter}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: 'auto' }}
              title="Copy Cover Letter to clipboard"
            >
              {copied === 'cover' ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied === 'cover' ? 'Copied Letter' : 'Copy Cover Letter'}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCopyMarkdown}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: 'auto' }}
                title="Copy Markdown content"
              >
                {copied === 'markdown' ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied === 'markdown' ? 'Copied MD' : 'Copy MD'}</span>
              </button>
              
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCopyPlainText}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: 'auto' }}
                title="Copy stripped plain text for direct pasting into job forms"
              >
                {copied === 'text' ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied === 'text' ? 'Copied Text' : 'Copy Plain'}</span>
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePrint}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: 'auto' }}
                title="Save as PDF using browser printing tools (Command+P)"
              >
                <Printer size={14} />
                <span>Print / PDF</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="cv-display-content" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', marginTop: '1rem' }}>
        {activeTab === 'preview' && (
          <div className="print-pane" style={{ background: 'var(--bg-primary)', padding: '2rem 1rem', borderRadius: 'var(--border-radius-md)', display: 'flex', justifyContent: 'center', overflowX: 'auto', border: '1px solid var(--card-border)' }}>
            <div 
              className="resume-preview-sheet" 
              dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(result.cvMarkdown) }}
            />
          </div>
        )}

        {activeTab === 'editor' && (
          <div className="pane">
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Edit the markdown below. Changes will immediately sync to the PDF preview tab.
            </p>
            <textarea
              className="markdown-textarea"
              value={result.cvMarkdown}
              onChange={(e) => onUpdateMarkdown(e.target.value)}
              placeholder="Edit your CV here in markdown..."
            />
          </div>
        )}

        {activeTab === 'ats' && (
          <div className="pane ats-dashboard">
            <div className="ats-score-container">
              <div className="ats-score-ring">
                <svg className="ats-score-circle-svg">
                  <circle className="ats-score-circle-bg" cx="60" cy="60" r={radius} />
                  <circle
                    className={`ats-score-circle-fill ${getScoreColorClass(result.atsScore)}`}
                    cx="60"
                    cy="60"
                    r={radius}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <div className="ats-score-number" style={{ color: getScoreTextColor(result.atsScore) }}>
                  {result.atsScore}
                </div>
              </div>
              <div className="ats-score-label">ATS Match Score</div>
            </div>

            <div className="ats-breakdown">
              <div className="ats-section-card matched">
                <h4>Matched Keywords ({result.atsAnalysis.matchedKeywords.length})</h4>
                {result.atsAnalysis.matchedKeywords.length === 0 ? (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>None identified.</p>
                ) : (
                  <div className="ats-keyword-grid">
                    {result.atsAnalysis.matchedKeywords.map((kw, i) => (
                      <span key={i} className="keyword-tag matched-tag">{kw}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="ats-section-card missing">
                <h4>Missing Keywords ({result.atsAnalysis.missingKeywords.length})</h4>
                {result.atsAnalysis.missingKeywords.length === 0 ? (
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>None. Excellent coverage!</p>
                ) : (
                  <div className="ats-keyword-grid">
                    {result.atsAnalysis.missingKeywords.map((kw, i) => (
                      <span key={i} className="keyword-tag missing-tag">{kw}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="ats-section-card strengths">
                <h4>Strengths</h4>
                <ul className="ats-list">
                  {result.atsAnalysis.strengths.map((str, i) => (
                    <li key={i}>{str}</li>
                  ))}
                </ul>
              </div>

              <div className="ats-section-card weaknesses">
                <h4>Weaknesses / Gaps</h4>
                <ul className="ats-list">
                  {result.atsAnalysis.weaknesses.map((weak, i) => (
                    <li key={i}>{weak}</li>
                  ))}
                </ul>
              </div>

              <div className="ats-section-card recommendations">
                <h4>ATS Optimization Action Items</h4>
                <ul className="ats-list">
                  {result.atsAnalysis.actionItems.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tweaks' && (
          <div className="pane">
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Human-Friendly Enhancements</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              The LLM made the following structural and stylistic improvements to ensure the CV sounds natural and impactful to hiring managers (instead of looking like a cold keyword checklist):
            </p>
            <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {result.humanFriendlyChanges.map((change, i) => (
                <li key={i} style={{ lineHeight: 1.5 }}>
                  <strong>{change.split(':')[0]}:</strong>
                  {change.includes(':') ? change.split(':').slice(1).join(':') : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'cover' && (
          <div className="pane">
            <div className="flex-row-between" style={{ alignItems: 'baseline' }}>
              <h3 style={{ color: 'var(--text-primary)' }}>Summarized Cover Letter</h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              This short cover letter highlights your top qualifications relative to the JD. It is optimized to help the recruiter quickly digest your fit and shortlist you.
            </p>
            <div className="cover-letter-sheet">
              {result.coverLetter || 'No cover letter was generated. Try customising your resume again to generate a cover letter.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
