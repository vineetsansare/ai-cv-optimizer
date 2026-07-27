import React, { useState } from 'react';
import { History, Download, Eye, Sparkles, Calendar, ShieldCheck } from 'lucide-react';
import { LiquidCard } from './ui/LiquidCard';
import { parseMarkdownToHtml } from '../utils/mdParser';

export interface GenerationRecord {
  id: string;
  created_at: string;
  job_description: string;
  cv_markdown: string;
  cover_letter?: string;
  ats_score?: number;
  ats_analysis?: any;
  human_changes?: string[];
  provider_used?: string;
  model_used?: string;
}

interface CVHistoryPanelProps {
  generations: GenerationRecord[];
  loading: boolean;
  onSelectGeneration: (gen: GenerationRecord) => void;
}

export const CVHistoryPanel: React.FC<CVHistoryPanelProps> = ({
  generations,
  loading,
  onSelectGeneration
}) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadPDF = (gen: GenerationRecord) => {
    setDownloadingId(gen.id);
    const originalTitle = document.title;
    
    // Set document title for PDF output file name
    const timestampStr = new Date(gen.created_at).toISOString().split('T')[0];
    document.title = `CV_Optimized_${timestampStr}`;

    // Create temporary print container
    const printContainer = document.createElement('div');
    printContainer.id = 'temp-print-container';
    printContainer.className = 'cv-preview-container print-only-wrapper';
    printContainer.innerHTML = parseMarkdownToHtml(gen.cv_markdown);
    
    document.body.appendChild(printContainer);

    setTimeout(() => {
      window.print();
      document.body.removeChild(printContainer);
      document.title = originalTitle;
      setDownloadingId(null);
    }, 200);
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const getJDSnippet = (jdText: string) => {
    if (!jdText) return 'No job description preview available.';
    const cleanText = jdText.replace(/\s+/g, ' ').trim();
    return cleanText.length > 140 ? `${cleanText.substring(0, 140)}...` : cleanText;
  };

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Header Banner */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)'
          }}>
            <History size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Recent Generation History
            </h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Revisit, inspect, or export PDFs of your 5 most recent AI-customized resume profiles.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
          <Sparkles className="animate-spin" size={32} style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }} />
          <p style={{ fontSize: '0.95rem' }}>Loading recent CV generations from Supabase...</p>
        </div>
      ) : generations.length === 0 ? (
        <LiquidCard variant="glass" padding="lg" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--bg-secondary)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto'
          }}>
            <History size={28} />
          </div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: 700 }}>
            No Generations Found
          </h3>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
            When you optimize a CV using target job descriptions, your top 5 customized versions will automatically appear here for instant preview and PDF export.
          </p>
        </LiquidCard>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {generations.map((gen, idx) => {
            const ats = gen.ats_score || 88;
            const scoreColor = ats >= 85 ? '#10b981' : ats >= 70 ? '#f59e0b' : '#ef4444';

            return (
              <LiquidCard
                key={gen.id || idx}
                variant="glass"
                padding="md"
                className="entrance-fade"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '20px',
                  border: '1px solid var(--card-border)',
                  background: 'var(--card-bg)',
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease'
                }}
              >
                <div>
                  {/* Top Bar: Index & ATS Score */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                      Generation #{generations.length - idx}
                    </span>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '20px',
                      background: `${scoreColor}15`,
                      border: `1px solid ${scoreColor}40`,
                      color: scoreColor,
                      fontSize: '0.78rem',
                      fontWeight: 700
                    }}>
                      <ShieldCheck size={14} />
                      <span>{ats}% ATS Match</span>
                    </div>
                  </div>

                  {/* 2-Line JD Snippet */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Target Job Profile
                    </h4>
                    <p style={{
                      margin: 0,
                      fontSize: '0.88rem',
                      color: 'var(--text-primary)',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontWeight: 500
                    }}>
                      "{getJDSnippet(gen.job_description)}"
                    </p>
                  </div>

                  {/* Metadata Row: Date & Model */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                      <span>{formatDate(gen.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.65rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--card-border)'
                }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => onSelectGeneration(gen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--card-border)',
                      color: 'var(--text-primary)',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '10px'
                    }}
                  >
                    <Eye size={15} />
                    <span>View / Load</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-glowing"
                    disabled={downloadingId === gen.id}
                    onClick={() => handleDownloadPDF(gen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                      color: '#ffffff',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '10px',
                      border: 'none'
                    }}
                  >
                    <Download size={15} />
                    <span>{downloadingId === gen.id ? 'Exporting...' : 'PDF'}</span>
                  </button>
                </div>
              </LiquidCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
