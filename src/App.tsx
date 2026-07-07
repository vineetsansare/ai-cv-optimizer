import { useState, useEffect } from 'react';
import { SettingsPanel } from './components/SettingsPanel';
import { JobInput } from './components/JobInput';
import { CVDisplay } from './components/CVDisplay';
import { generateCustomizedCV } from './utils/llm';
import type { LLMConfig, CVGenerationResult } from './utils/llm';
import { AlertCircle, Sparkles, Wand2, Sun, Moon } from 'lucide-react';

const LOCAL_STORAGE_KEY_CONFIG = 'cv_builder_llm_config';
const LOCAL_STORAGE_KEY_CVS = 'cv_builder_context_cvs';
const LOCAL_STORAGE_KEY_THEME = 'cv_builder_theme';
const LOCAL_STORAGE_KEY_SIDEBAR = 'cv_builder_sidebar_collapsed';

const DEFAULT_CONFIG: LLMConfig = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-2.5-flash',
};

function App() {
  const [config, setConfig] = useState<LLMConfig>(DEFAULT_CONFIG);
  const [contextCVs, setContextCVs] = useState<{ name: string; text: string }[]>([]);
  const [activeCVIndices, setActiveCVIndices] = useState<number[]>([]);
  const [jobDescription, setJobDescription] = useState('');
  const [aspirations, setAspirations] = useState('');
  
  // Theme & Sidebar States (Iteration 2)
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0); 
  const [result, setResult] = useState<CVGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load configuration, CVs, theme, and sidebar state from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem(LOCAL_STORAGE_KEY_CONFIG);
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error('Error loading config from localStorage', e);
      }
    }

    const savedCVs = localStorage.getItem(LOCAL_STORAGE_KEY_CVS);
    if (savedCVs) {
      try {
        const parsed = JSON.parse(savedCVs);
        setContextCVs(parsed);
        setActiveCVIndices(parsed.map((_: any, idx: number) => idx));
      } catch (e) {
        console.error('Error loading CVs from localStorage', e);
      }
    }

    // Load Theme (Default: light)
    const savedTheme = localStorage.getItem(LOCAL_STORAGE_KEY_THEME) as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme('light');
    }

    // Load Sidebar Collapse State
    const savedSidebar = localStorage.getItem(LOCAL_STORAGE_KEY_SIDEBAR);
    if (savedSidebar) {
      setSidebarCollapsed(JSON.parse(savedSidebar));
    }
  }, []);

  const applyTheme = (t: 'light' | 'dark') => {
    const body = document.body;
    if (t === 'dark') {
      body.classList.add('dark-theme');
    } else {
      body.classList.remove('dark-theme');
    }
  };

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
    localStorage.setItem(LOCAL_STORAGE_KEY_THEME, newTheme);
  };

  const handleSidebarToggle = () => {
    const nextState = !sidebarCollapsed;
    setSidebarCollapsed(nextState);
    localStorage.setItem(LOCAL_STORAGE_KEY_SIDEBAR, JSON.stringify(nextState));
  };

  // Update localStorage when config changes
  const handleConfigChange = (newConfig: LLMConfig) => {
    setConfig(newConfig);
    localStorage.setItem(LOCAL_STORAGE_KEY_CONFIG, JSON.stringify(newConfig));
  };

  // Add a parsed CV to context
  const handleAddCV = (name: string, text: string) => {
    const updatedCVs = [...contextCVs, { name, text }];
    setContextCVs(updatedCVs);
    localStorage.setItem(LOCAL_STORAGE_KEY_CVS, JSON.stringify(updatedCVs));
    setActiveCVIndices([...activeCVIndices, updatedCVs.length - 1]);
  };

  // Remove a CV from context
  const handleRemoveCV = (indexToRemove: number) => {
    const updatedCVs = contextCVs.filter((_, idx) => idx !== indexToRemove);
    setContextCVs(updatedCVs);
    localStorage.setItem(LOCAL_STORAGE_KEY_CVS, JSON.stringify(updatedCVs));

    // Update active indices
    const updatedActive = activeCVIndices
      .filter((idx) => idx !== indexToRemove)
      .map((idx) => (idx > indexToRemove ? idx - 1 : idx));
    setActiveCVIndices(updatedActive);
  };

  // Toggle CV inclusion
  const handleToggleCVIndex = (index: number) => {
    if (activeCVIndices.includes(index)) {
      setActiveCVIndices(activeCVIndices.filter((idx) => idx !== index));
    } else {
      setActiveCVIndices([...activeCVIndices, index]);
    }
  };

  // Trigger loader step text changes
  useEffect(() => {
    let interval: any;
    if (generating) {
      interval = setInterval(() => {
        setGenStep((prev) => (prev + 1) % 4);
      }, 3500);
    } else {
      setGenStep(0);
    }
    return () => clearInterval(interval);
  }, [generating]);

  // Execute CV generation
  const handleGenerate = async () => {
    if (activeCVIndices.length === 0) {
      setError('Please select at least one CV from the context checkboxes to use as career history.');
      return;
    }

    setGenerating(true);
    setError(null);
    
    const activeCVs = activeCVIndices.map((idx) => contextCVs[idx]);

    try {
      const cvResult = await generateCustomizedCV(config, activeCVs, jobDescription, aspirations);
      setResult(cvResult);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred while communicating with the LLM API.');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateMarkdown = (newMarkdown: string) => {
    if (result) {
      setResult({
        ...result,
        cvMarkdown: newMarkdown
      });
    }
  };

  // Loading animation step messages
  const getLoaderText = () => {
    switch (genStep) {
      case 0: return { title: 'Scanning Job Description', desc: 'Analyzing the JD to extract core technical stack, keywords, and soft skills requirements...' };
      case 1: return { title: 'Mapping Career Experience', desc: 'Searching your uploaded profiles to find matching achievements, roles, and project evidence...' };
      case 2: return { title: 'Optimizing ATS Compatibility', desc: 'Crafting the CV outline, embedding keywords naturally, and structuring bullet points for scanner scoring...' };
      case 3: return { title: 'Applying Human-Friendly Polish', desc: 'Refining grammar, using strong action verbs, and formatting the markdown layout for the preview...' };
      default: return { title: 'Processing API Request', desc: 'Generating your customized resume...' };
    }
  };

  return (
    <div className={`app-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <SettingsPanel
        config={config}
        onChangeConfig={handleConfigChange}
        contextCVs={contextCVs}
        onAddCV={handleAddCV}
        onRemoveCV={handleRemoveCV}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleSidebarToggle}
      />

      <main className="main-content">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Antigravity CV Optimizer</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
              Instantly customize your career history to fit any job opening with perfect ATS styling.
            </p>
          </div>
          
          <div className="flex-row-gap">
            <button
              type="button"
              className="theme-toggle-header-btn"
              onClick={handleThemeToggle}
              title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <div className="flex-row-gap" style={{ background: 'var(--bg-tertiary)', padding: '0.4rem 0.8rem', borderRadius: '999px', fontSize: '0.85rem', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}>
              <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} />
              <span>100% Client-Side & Private</span>
            </div>
          </div>
        </header>

        {error && (
          <div className="glass-card" style={{ borderLeft: '4px solid var(--danger)', background: 'rgba(255, 59, 48, 0.05)', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <AlertCircle size={24} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <div>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Generation Failed</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{error}</p>
            </div>
          </div>
        )}

        {!generating && !result && (
          <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '0.5rem' }}>
            <div>
              <h3 className="flex-row-gap" style={{ marginBottom: '0.75rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-primary)', fontSize: '0.8rem', color: '#ffffff' }}>1</span>
                Configure Provider & Keys
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Enter your Google Gemini API key in the left panel. Gemini models run directly in the browser with zero server latency or middleware tracking.
              </p>
            </div>
            
            <div>
              <h3 className="flex-row-gap" style={{ marginBottom: '0.75rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-primary)', fontSize: '0.8rem', color: '#ffffff' }}>2</span>
                Upload Your Profiles
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Upload one or multiple resumes (.pdf, .txt, or .md format). The tool reads experience bullet points across files to establish a rich context library.
              </p>
            </div>

            <div>
              <h3 className="flex-row-gap" style={{ marginBottom: '0.75rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-primary)', fontSize: '0.8rem', color: '#ffffff' }}>3</span>
                Input Job Details & Run
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Paste the target job description and hit the generate button. The AI will output an ATS-optimized, beautifully styled Markdown resume ready to print as PDF!
              </p>
            </div>
          </div>
        )}

        <JobInput
          jobDescription={jobDescription}
          onChangeJobDescription={setJobDescription}
          aspirations={aspirations}
          onChangeAspirations={setAspirations}
          config={config}
          contextCVs={contextCVs}
          activeCVIndices={activeCVIndices}
          onToggleCVIndex={handleToggleCVIndex}
          onGenerate={handleGenerate}
          generating={generating}
        />

        {generating && (
          <div className="glass-card scanner-container">
            <div className="radar-sweep">
              <div className="radar-scan-line"></div>
              <div className="radar-grid"></div>
              <Wand2 size={36} style={{ zIndex: 10, color: 'var(--accent-primary)' }} />
            </div>
            <div className="scanner-text">{getLoaderText().title}</div>
            <div className="scanner-subtext">{getLoaderText().desc}</div>
          </div>
        )}

        {!generating && result && (
          <CVDisplay
            result={result}
            onUpdateMarkdown={handleUpdateMarkdown}
          />
        )}
      </main>
    </div>
  );
}

export default App;
