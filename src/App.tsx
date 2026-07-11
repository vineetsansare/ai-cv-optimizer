import { useState, useEffect, useRef } from 'react';
import { SettingsPanel } from './components/SettingsPanel';
import { JobInput } from './components/JobInput';
import { CVDisplay } from './components/CVDisplay';
import { AuthForm } from './components/AuthForm';
import { generateCustomizedCV, autoFixCV } from './utils/llm';
import type { LLMConfig, CVGenerationResult, TargetLength } from './utils/llm';
import { Sparkles, Sun, Moon, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from './utils/supabase';

const LOCAL_STORAGE_KEY_CONFIG = 'cv_builder_llm_config';
const LOCAL_STORAGE_KEY_THEME = 'cv_builder_theme';
const LOCAL_STORAGE_KEY_SIDEBAR = 'cv_builder_sidebar_collapsed';

const DEFAULT_CONFIG: LLMConfig = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-2.5-flash',
};

interface CloudCV {
  id?: string;
  name: string;
  text: string;
}

interface UserProfile {
  email: string;
  full_name?: string;
  plan: 'free' | 'byok' | 'pro';
  generation_count: number;
}

function App() {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [config, setConfig] = useState<LLMConfig>(DEFAULT_CONFIG);
  const [contextCVs, setContextCVs] = useState<CloudCV[]>([]);
  const [activeCVIndices, setActiveCVIndices] = useState<number[]>([]);
  const [jobDescription, setJobDescription] = useState('');
  const [aspirations, setAspirations] = useState('');
  const [targetLength, setTargetLength] = useState<TargetLength>('2-page');
  
  // Theme & Sidebar States
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [generating, setGenerating] = useState(false);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [genStep, setGenStep] = useState(0); 
  const [result, setResult] = useState<CVGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1. Auth Subscription & Session Setup
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadUserData(session);
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadUserData(session);
      } else {
        setUserProfile(null);
        setContextCVs([]);
        setActiveCVIndices([]);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch user profile and CVs from Supabase
  const loadUserData = async (currentSession: any) => {
    setAuthLoading(true);
    try {
      // Fetch or wait for profile trigger
      let profile = null;
      let retryCount = 0;

      while (retryCount < 5) {
        const { data, error: _error } = await supabase
          .from('profiles')
          .select('email, full_name, plan, generation_count')
          .eq('id', currentSession.user.id)
          .maybeSingle();

        if (data) {
          profile = data;
          break;
        }

        // Wait 1s and retry if trigger hasn't fired yet
        await new Promise(res => setTimeout(res, 1000));
        retryCount++;
      }

      if (profile) {
        setUserProfile({
          email: profile.email,
          full_name: profile.full_name,
          plan: profile.plan as 'free' | 'byok' | 'pro',
          generation_count: profile.generation_count || 0
        });
      }

      // Fetch user's saved CVs
      const { data: cvs, error: _cvError } = await supabase
        .from('cv_documents')
        .select('id, filename, extracted_text')
        .eq('user_id', currentSession.user.id);

      if (cvs && !_cvError) {
        const mappedCVs = cvs.map(c => ({
          id: c.id,
          name: c.filename,
          text: c.extracted_text
        }));
        setContextCVs(mappedCVs);
        setActiveCVIndices(mappedCVs.map((_, idx) => idx));
      }
    } catch (err) {
      console.error('Error loading session data:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  // 3. Load configurations & theme from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem(LOCAL_STORAGE_KEY_CONFIG);
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error('Error loading config from localStorage', e);
      }
    }

    const savedTheme = localStorage.getItem(LOCAL_STORAGE_KEY_THEME) as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme('light');
    }

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

  const handleConfigChange = (newConfig: LLMConfig) => {
    setConfig(newConfig);
    localStorage.setItem(LOCAL_STORAGE_KEY_CONFIG, JSON.stringify(newConfig));
  };

  // Add CV to Supabase Database
  const handleAddCV = async (name: string, text: string) => {
    if (!session) return;
    try {
      const { data, error } = await supabase
        .from('cv_documents')
        .insert({
          user_id: session.user.id,
          filename: name,
          extracted_text: text
        })
        .select()
        .single();

      if (error) throw error;

      const newCV = { id: data.id, name, text };
      const updatedCVs = [...contextCVs, newCV];
      setContextCVs(updatedCVs);
      setActiveCVIndices([...activeCVIndices, updatedCVs.length - 1]);
    } catch (err: any) {
      console.error('Failed to save CV to cloud:', err);
      setError('Failed to upload CV to database.');
    }
  };

  // Remove CV from Supabase Database
  const handleRemoveCV = async (indexToRemove: number) => {
    const cvToRemove = contextCVs[indexToRemove];
    if (!cvToRemove || !session) return;

    try {
      if (cvToRemove.id) {
        const { error } = await supabase
          .from('cv_documents')
          .delete()
          .eq('id', cvToRemove.id);
        if (error) throw error;
      }

      const updatedCVs = contextCVs.filter((_, idx) => idx !== indexToRemove);
      setContextCVs(updatedCVs);

      const updatedActive = activeCVIndices
        .filter((idx) => idx !== indexToRemove)
        .map((idx) => (idx > indexToRemove ? idx - 1 : idx));
      setActiveCVIndices(updatedActive);
    } catch (err) {
      console.error('Failed to delete CV from cloud:', err);
      setError('Failed to delete CV from database.');
    }
  };

  const handleToggleCVIndex = (index: number) => {
    if (activeCVIndices.includes(index)) {
      setActiveCVIndices(activeCVIndices.filter((idx) => idx !== index));
    } else {
      setActiveCVIndices([...activeCVIndices, index]);
    }
  };

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

  const handleGenerate = async () => {
    if (activeCVIndices.length === 0) {
      setError('Please select at least one CV from the context checkboxes to use as career history.');
      return;
    }

    setGenerating(true);
    setError(null);
    abortControllerRef.current = new AbortController();
    
    const activeCVs = activeCVIndices.map((idx) => contextCVs[idx]);

    try {
      const cvResult = await generateCustomizedCV(config, activeCVs, jobDescription, aspirations, targetLength, abortControllerRef.current.signal);
      setResult(cvResult);
      
      // Update local quota count if free user
      if (userProfile && userProfile.plan === 'free') {
        setUserProfile(prev => prev ? { ...prev, generation_count: prev.generation_count + 1 } : null);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('CV generation cancelled by user.');
        return;
      }
      console.error(err);
      setError(err.message || 'An unexpected error occurred while communicating with the LLM API.');
    } finally {
      setGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleAutoFix = async () => {
    if (!result) return;
    
    setGenerating(true);
    setIsAutoFixing(true);
    setError(null);
    abortControllerRef.current = new AbortController();

    try {
      const fixedResult = await autoFixCV(config, result.cvMarkdown, jobDescription, result.atsAnalysis, abortControllerRef.current.signal);
      setResult(fixedResult);

      if (userProfile && userProfile.plan === 'free') {
        setUserProfile(prev => prev ? { ...prev, generation_count: prev.generation_count + 1 } : null);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Auto-fix cancelled by user.');
        return;
      }
      console.error(err);
      setError(err.message || 'An unexpected error occurred while auto-fixing with the LLM API.');
    } finally {
      setGenerating(false);
      setIsAutoFixing(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getLoaderText = () => {
    if (isAutoFixing) {
      switch (genStep) {
        case 0: return { title: 'Analyzing Gaps', desc: 'Identifying the missing keywords and weaknesses from the ATS scan...' };
        case 1: return { title: 'Weaving Keywords', desc: 'Organically injecting keywords into your bullet points without sounding robotic...' };
        case 2: return { title: 'Refining Tone', desc: 'Applying a human-friendly polish to the newly generated achievements...' };
        case 3: return { title: 'Updating Cover Letter', desc: 'Aligning the cover letter with the newly strengthened CV...' };
        default: return { title: 'Processing Auto-Fix', desc: 'Optimizing your resume...' };
      }
    }
    
    switch (genStep) {
      case 0: return { title: 'Scanning Job Description', desc: 'Analyzing the JD to extract core technical stack, keywords, and soft skills requirements...' };
      case 1: return { title: 'Mapping Career Experience', desc: 'Searching your uploaded profiles to find matching achievements, roles, and project evidence...' };
      case 2: return { title: 'Optimizing ATS Compatibility', desc: 'Crafting the CV outline, embedding keywords naturally, and structuring bullet points for scanner scoring...' };
      case 3: return { title: 'Applying Human-Friendly Polish', desc: 'Refining grammar, using strong action verbs, and formatting the markdown layout for the preview...' };
      default: return { title: 'Processing API Request', desc: 'Generating your customized resume...' };
    }
  };

  // 4. Loading States
  if (authLoading && !session) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <div className="radar-spinner" style={{ width: '48px', height: '48px', border: '3px solid var(--card-border)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Initializing secure environment...</span>
        </div>
      </div>
    );
  }

  // 5. Auth Wall
  if (!session) {
    return (
      <div style={{ 
        display: 'flex', 
        height: '100vh', 
        width: '100vw', 
        justifyContent: 'center', 
        alignItems: 'center', 
        background: 'radial-gradient(circle at center, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Apple-like soft backlighting */}
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: '400px', height: '400px', background: 'rgba(99, 102, 241, 0.1)', filter: 'blur(100px)', borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', bottom: '10%', right: '20%', width: '400px', height: '400px', background: 'rgba(16, 185, 129, 0.08)', filter: 'blur(100px)', borderRadius: '50%' }}></div>
        
        <AuthForm onSuccess={() => {}} />
      </div>
    );
  }

  const loaderText = getLoaderText();

  // 6. Logged In Main App
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
        userProfile={userProfile}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <header className="app-header">
          <div className="flex-row-gap">
            <Sparkles className="text-accent-primary" size={24} />
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Antigravity CV Optimizer</h1>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                Instantly customize your career history to fit any job opening with perfect ATS styling.
              </p>
            </div>
          </div>
          
          <div className="flex-row-gap">
            <div className="privacy-badge">
              <ShieldCheck size={14} className="text-accent-secondary" />
              <span>100% Client-Side & Private</span>
            </div>
            
            <button
              type="button"
              className="theme-toggle"
              onClick={handleThemeToggle}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </header>

        {generating && (
          <div className="scanner-container">
            <div className="scanner-radar">
              <div className="scanner-line"></div>
              <div className="radar-grid"></div>
            </div>
            <div className="scanner-text">{loaderText.title}</div>
            <div className="scanner-subtext">{loaderText.desc}</div>
            <button type="button" className="btn" onClick={handleCancel} style={{ marginTop: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
              Cancel Request
            </button>
          </div>
        )}

        {!generating && !result && (
          <div className="onboarding-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="onboarding-card">
              <div className="step-num">1</div>
              <h3>Configure Provider & Keys</h3>
              <p>Enter your Google Gemini API key in the left panel. Gemini models run directly in the browser with zero server latency or middleware tracking.</p>
            </div>
            <div className="onboarding-card">
              <div className="step-num">2</div>
              <h3>Upload Your Profiles</h3>
              <p>Upload one or multiple resumes (.pdf, .txt, or .md format). The tool reads experience bullet points across files to establish a rich context library.</p>
            </div>
            <div className="onboarding-card">
              <div className="step-num">3</div>
              <h3>Input Job Details & Run</h3>
              <p>Paste the target job description and hit the generate button. The AI will output an ATS-optimized, beautifully styled Markdown resume ready to print as PDF!</p>
            </div>
          </div>
        )}

        {!generating && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {error && (
              <div className="flex-row-gap" style={{ color: 'var(--danger)', fontSize: '0.85rem', background: 'rgba(255, 59, 48, 0.08)', padding: '0.75rem 1rem', borderRadius: 'var(--border-radius-md)', border: '1px solid rgba(255, 59, 48, 0.15)' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}
            <JobInput
              jobDescription={jobDescription}
              onChangeJobDescription={setJobDescription}
              aspirations={aspirations}
              onChangeAspirations={setAspirations}
              targetLength={targetLength}
              onChangeTargetLength={setTargetLength}
              config={config}
              contextCVs={contextCVs}
              activeCVIndices={activeCVIndices}
              onToggleCVIndex={handleToggleCVIndex}
              onGenerate={handleGenerate}
              generating={generating}
            />

            {result && (
              <CVDisplay
                result={result}
                onUpdateMarkdown={handleUpdateMarkdown}
                onAutoFix={handleAutoFix}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
