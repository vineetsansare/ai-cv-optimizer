import { useState, useEffect, useRef } from 'react';
import { SettingsPanel } from './components/SettingsPanel';
import { CVDisplay } from './components/CVDisplay';
import { AuthForm } from './components/AuthForm';
import { generateCustomizedCV, autoFixCV, getSavedAPIKeysStatus } from './utils/llm';
import type { LLMConfig, CVGenerationResult, TargetLength } from './utils/llm';
import { parsePdf } from './utils/pdfParser';
import { 
  Sparkles, Sun, Moon, AlertCircle,
  LayoutDashboard, FileText, Briefcase, BarChart3,
  Settings, LogOut, ChevronLeft, ChevronRight,
  Upload, Plus, Download, Trash2,
  Copy, Search, ArrowRight, Zap, ArrowLeft
} from 'lucide-react';
import { supabase } from './utils/supabase';

const LOCAL_STORAGE_KEY_CONFIG = 'cv_builder_llm_config';
const LOCAL_STORAGE_KEY_THEME = 'cv_builder_theme';
const LOCAL_STORAGE_KEY_SIDEBAR = 'cv_builder_sidebar_collapsed';

const DEFAULT_CONFIG: LLMConfig = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-3.5-flash',
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

  // Password reset flow states
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const [config, setConfig] = useState<LLMConfig>(DEFAULT_CONFIG);
  const [contextCVs, setContextCVs] = useState<CloudCV[]>([]);
  const [activeCVIndices, setActiveCVIndices] = useState<number[]>([]);
  const [jobDescription, setJobDescription] = useState('');
  const [aspirations, setAspirations] = useState('');
  const [targetLength, setTargetLength] = useState<TargetLength>('2-page');
  
  // Theme & Layout States
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'workspace' | 'quick-optimize' | 'resumes' | 'applications' | 'reports' | 'settings'>('workspace');
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [customizerStep, setCustomizerStep] = useState(1);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [generating, setGenerating] = useState(false);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [genStep, setGenStep] = useState(0); 
  const [result, setResult] = useState<CVGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsingFile, setParsingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // BYOK Saved Keys Status
  const [savedKeys, setSavedKeys] = useState<{ gemini: boolean; openai: boolean; anthropic: boolean }>({
    gemini: false,
    openai: false,
    anthropic: false
  });

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setIsResettingPassword(true);
      }
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

        await new Promise(res => setTimeout(res, 1000));
        retryCount++;
      }

      if (profile) {
        const plan = profile.plan as 'free' | 'byok' | 'pro';
        setUserProfile({
          email: profile.email,
          full_name: profile.full_name,
          plan,
          generation_count: profile.generation_count || 0
        });

        if (plan === 'free') {
          setConfig(prev => ({
            ...prev,
            provider: 'gemini',
            model: 'gemini-3.5-flash'
          }));
        } else if (plan === 'byok') {
          getSavedAPIKeysStatus().then(setSavedKeys);
        }
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
    
    const limit = userProfile?.plan === 'free' ? 1 : 5;
    if (contextCVs.length >= limit) {
      setError(`Your plan (${userProfile?.plan.toUpperCase()}) is limited to maximum ${limit} CV profile(s). Please remove a profile before uploading or upgrade your plan.`);
      return;
    }

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
      setError(null);
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
      setError(null);
    } catch (err) {
      console.error('Failed to delete CV from cloud:', err);
      setError('Failed to delete CV from database.');
    }
  };

  const handleDuplicateCV = async (cv: CloudCV) => {
    if (!session) return;
    const limit = userProfile?.plan === 'free' ? 1 : 5;
    if (contextCVs.length >= limit) {
      setError(`Your plan (${userProfile?.plan.toUpperCase()}) is limited to maximum ${limit} CV profile(s). Remove a profile before duplicating or upgrade.`);
      return;
    }
    await handleAddCV(`${cv.name.replace(/\.[^/.]+$/, "")} (Copy)`, cv.text);
  };

  const handleDownloadCV = (cvName: string, text: string) => {
    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${cvName.replace(/\.[^/.]+$/, "")}_optimized.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleToggleCVIndex = (index: number) => {
    if (activeCVIndices.includes(index)) {
      setActiveCVIndices(activeCVIndices.filter((idx) => idx !== index));
    } else {
      setActiveCVIndices([...activeCVIndices, index]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
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

        await handleAddCV(file.name, text);
      } catch (err: any) {
        console.error(err);
        setError(err.message || `Failed to parse ${file.name}`);
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

    const activeConfig = userProfile?.plan === 'free'
      ? { ...config, provider: 'gemini' as const, model: 'gemini-3.5-flash' }
      : config;

    try {
      const cvResult = await generateCustomizedCV(activeConfig, activeCVs, jobDescription, aspirations, targetLength, abortControllerRef.current.signal);
      setResult(cvResult);
      
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

    const activeConfig = userProfile?.plan === 'free'
      ? { ...config, provider: 'gemini' as const, model: 'gemini-3.5-flash' }
      : config;

    try {
      const fixedResult = await autoFixCV(activeConfig, result.cvMarkdown, jobDescription, result.atsAnalysis, abortControllerRef.current.signal);
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

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);
    setResetSuccess(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setResetSuccess('Password updated successfully! Redirecting...');
      setTimeout(() => {
        setIsResettingPassword(false);
        setNewPassword('');
      }, 2000);
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
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

  const isKeyConfigured = 
    userProfile?.plan === 'pro' || 
    userProfile?.plan === 'free' || 
    (userProfile?.plan === 'byok' && savedKeys[config.provider]);

  // Password reset UI Overlay
  if (isResettingPassword) {
    return (
      <div style={{ 
        display: 'flex', 
        height: '100vh', 
        width: '100vw', 
        justifyContent: 'center', 
        alignItems: 'center', 
        background: 'radial-gradient(circle at center, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: '400px',
          padding: '2.5rem',
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: 'var(--border-radius-lg)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(20px)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Set New Password</h2>
          
          {resetError && (
            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              {resetError}
            </div>
          )}
          {resetSuccess && (
            <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-mint)', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.85rem' }}>
              {resetSuccess}
            </div>
          )}
          
          <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="new-password">New Password</label>
              <input
                id="new-password"
                type="password"
                required
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={resetLoading} style={{ marginTop: '0.5rem' }}>
              {resetLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Loading States
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

  // Auth Wall
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
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: '400px', height: '400px', background: 'rgba(99, 102, 241, 0.1)', filter: 'blur(100px)', borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', bottom: '10%', right: '20%', width: '400px', height: '400px', background: 'rgba(16, 185, 129, 0.08)', filter: 'blur(100px)', borderRadius: '50%' }}></div>
        
        <AuthForm onSuccess={() => {}} />
      </div>
    );
  }

  const loaderText = getLoaderText();

  // Render view functions
  const renderSidebar = () => {
    return (
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`} style={{ width: sidebarCollapsed ? '72px' : '260px' }}>
        <button
          type="button"
          className="sidebar-toggle-btn"
          onClick={handleSidebarToggle}
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className="sidebar-scroll-area" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem 1rem' }}>
          <div className="flex-row-gap" style={{ marginBottom: '2.5rem', paddingLeft: '0.5rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Sparkles size={18} />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>JD2CV</h1>
                <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0, color: 'var(--text-muted)', fontWeight: 600 }}>Career Workspace</p>
              </div>
            )}
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flexGrow: 1 }}>
            <button 
              className={`tab ${activeTab === 'workspace' && !isCustomizing ? 'active' : ''}`} 
              onClick={() => { setActiveTab('workspace'); setIsCustomizing(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', width: '100%', border: 'none', background: 'none', color: 'inherit', textAlign: 'left', borderRadius: '8px', cursor: 'pointer' }}
            >
              <LayoutDashboard size={18} />
              {!sidebarCollapsed && <span className="font-label-sm">Dashboard</span>}
            </button>

            <button 
              className={`tab ${activeTab === 'quick-optimize' && !isCustomizing ? 'active' : ''}`} 
              onClick={() => { setActiveTab('quick-optimize'); setIsCustomizing(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', width: '100%', border: 'none', background: 'none', color: 'inherit', textAlign: 'left', borderRadius: '8px', cursor: 'pointer' }}
            >
              <Sparkles size={18} style={{ color: 'var(--accent-secondary)' }} />
              {!sidebarCollapsed && <span className="font-label-sm">Quick Optimize</span>}
            </button>

            <button 
              className={`tab ${activeTab === 'resumes' && !isCustomizing ? 'active' : ''}`} 
              onClick={() => { setActiveTab('resumes'); setIsCustomizing(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', width: '100%', border: 'none', background: 'none', color: 'inherit', textAlign: 'left', borderRadius: '8px', cursor: 'pointer' }}
            >
              <FileText size={18} />
              {!sidebarCollapsed && <span className="font-label-sm">My Resumes</span>}
            </button>

            <button 
              className={`tab ${activeTab === 'applications' && !isCustomizing ? 'active' : ''}`} 
              onClick={() => { setActiveTab('applications'); setIsCustomizing(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', width: '100%', border: 'none', background: 'none', color: 'inherit', textAlign: 'left', borderRadius: '8px', cursor: 'pointer' }}
            >
              <Briefcase size={18} />
              {!sidebarCollapsed && <span className="font-label-sm">Job Applications</span>}
            </button>

            <button 
              className={`tab ${activeTab === 'reports' && !isCustomizing ? 'active' : ''}`} 
              onClick={() => { setActiveTab('reports'); setIsCustomizing(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', width: '100%', border: 'none', background: 'none', color: 'inherit', textAlign: 'left', borderRadius: '8px', cursor: 'pointer' }}
            >
              <BarChart3 size={18} />
              {!sidebarCollapsed && <span className="font-label-sm">ATS Reports</span>}
            </button>

            <div style={{ margin: '1rem 0 0.5rem 0.5rem', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              {!sidebarCollapsed && "System"}
            </div>

            <button 
              className={`tab ${activeTab === 'settings' && !isCustomizing ? 'active' : ''}`} 
              onClick={() => { setActiveTab('settings'); setIsCustomizing(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', width: '100%', border: 'none', background: 'none', color: 'inherit', textAlign: 'left', borderRadius: '8px', cursor: 'pointer' }}
            >
              <Settings size={18} />
              {!sidebarCollapsed && <span className="font-label-sm">Settings</span>}
            </button>
          </nav>

          <div style={{ marginTop: 'auto' }}>
            {!sidebarCollapsed && (
              <div className="glass-card" style={{ padding: '1rem', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', marginBottom: '1rem' }}>
                <span className="font-label-sm" style={{ fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                  {userProfile?.plan === 'pro' ? 'Pro Plan' : userProfile?.plan === 'byok' ? 'BYOK Plan' : 'Free Tier'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {userProfile?.plan === 'free' ? `${userProfile.generation_count} of 3 free generated` : 'Unlimited optimized CVs'}
                </span>
              </div>
            )}
            
            <button 
              type="button" 
              onClick={handleLogout}
              className="tab" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', width: '100%', border: 'none', background: 'none', color: 'var(--danger)', textAlign: 'left', borderRadius: '8px', cursor: 'pointer' }}
            >
              <LogOut size={18} />
              {!sidebarCollapsed && <span className="font-label-sm">Log Out</span>}
            </button>
          </div>
        </div>
      </aside>
    );
  };

  const renderTopNav = () => {
    return (
      <header className="glass-header top-header">
        <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1, maxWidth: '400px' }}>
          <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '0.4rem 0.75rem' }}>
            <Search size={16} style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }} />
            <input 
              type="text" 
              placeholder="Search Workspace..." 
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: '0.85rem', width: '100%', padding: 0 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            type="button" 
            className="theme-toggle-header-btn" 
            onClick={handleThemeToggle}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          <button 
            type="button"
            className="btn btn-primary"
            onClick={() => { setIsCustomizing(true); setCustomizerStep(1); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'auto', padding: '0.5rem 1.25rem', borderRadius: '20px', background: 'var(--accent-primary)', fontSize: '0.85rem' }}
          >
            <Plus size={16} />
            <span>Create Resume</span>
          </button>
        </div>
      </header>
    );
  };

  const renderWorkspaceTab = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Welcome Section */}
        <section className="entrance-fade" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '2.1rem', margin: 0, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              Welcome back, {userProfile?.full_name?.split(' ')[0] || 'Vineet'} 👋
            </h2>
            <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
              You have 2 pending ATS optimizations and 3 new job matches today.
            </p>
          </div>
          <div className="glass-card" style={{ display: 'flex', gap: '1.5rem', padding: '0.75rem 1.5rem', borderRadius: '16px', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)', background: 'var(--card-bg)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>Avg ATS Score</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>85%</span>
            </div>
            <div style={{ width: '1px', background: 'var(--card-border)' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>Applications</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>3</span>
            </div>
          </div>
        </section>

        {/* Quick Actions Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md entrance-fade" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div className="onboarding-card-redesign" onClick={() => { setIsCustomizing(true); setCustomizerStep(1); }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <Plus size={20} />
            </div>
            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 600 }}>Create New</h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Build from a smart template</p>
          </div>

          <div className="onboarding-card-redesign" onClick={() => { setActiveTab('resumes'); setTimeout(() => fileInputRef.current?.click(), 100); }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(124, 58, 237, 0.1)', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <Upload size={20} />
            </div>
            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 600 }}>Upload Resume</h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Scan and optimize existing PDF</p>
          </div>

          <div className="onboarding-card-redesign" onClick={() => { setIsCustomizing(true); setCustomizerStep(2); }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(186, 72, 0, 0.1)', color: 'var(--accent-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <FileText size={20} />
            </div>
            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 600 }}>Paste JD</h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Match against a specific role</p>
          </div>

          <div className="onboarding-card-redesign" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <Zap size={20} />
            </div>
            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>LinkedIn Import</span>
              <span style={{ fontSize: '8px', padding: '2px 6px', background: 'var(--bg-tertiary)', borderRadius: '99px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Coming Soon</span>
            </h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sync profile details automatically</p>
          </div>
        </section>

        {/* 2-Column Canvas Layout */}
        <div className="workspace-grid">
          
          {/* Main Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Active Unfinished project indicator if CV results are present */}
            {result && (
              <section className="entrance-fade" style={{ background: 'var(--accent-primary)', borderRadius: '16px', padding: '1.75rem', color: '#ffffff', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                  <div style={{ flexGrow: 1 }}>
                    <span style={{ fontSize: '9px', padding: '2px 8px', background: 'rgba(255,255,255,0.2)', borderRadius: '99px', textTransform: 'uppercase', fontWeight: 600 }}>Current Work</span>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.5rem 0 0.25rem 0', color: '#fff' }}>Optimized Resume Completed</h3>
                    <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', margin: 0, maxWidth: '400px' }}>Your customized document score reached {result.atsScore}%. Open the workspace to review details and export PDF.</p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                      <button className="btn" onClick={() => { setIsCustomizing(true); setCustomizerStep(5); }} style={{ width: 'auto', background: '#ffffff', color: 'var(--accent-primary)', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                        Open Workspace
                      </button>
                    </div>
                  </div>
                  <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg style={{ width: '80px', height: '80px' }}>
                      <circle cx="40" cy="40" r="34" fill="transparent" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
                      <circle cx="40" cy="40" r="34" fill="transparent" stroke="#ffffff" strokeWidth="6" strokeDasharray="213.6" strokeDashoffset={213.6 - (result.atsScore / 100) * 213.6} strokeLinecap="round" className="progress-ring-circle" />
                    </svg>
                    <span style={{ position: 'absolute', fontSize: '1.1rem', fontWeight: 700 }}>{result.atsScore}%</span>
                  </div>
                </div>
              </section>
            )}

            {/* Recent Resumes Section */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>Recent Resumes</h3>
                <button className="tab" onClick={() => setActiveTab('resumes')} style={{ border: 'none', background: 'none', color: 'var(--accent-primary)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>View Library</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {contextCVs.length === 0 ? (
                  <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', borderStyle: 'dashed' }}>
                    <FileText size={32} style={{ margin: '0 auto 0.75rem', color: 'var(--text-muted)' }} />
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>No uploaded resumes. Click "Upload Resume" to get started.</p>
                  </div>
                ) : (
                  contextCVs.slice(0, 2).map((cv, index) => (
                    <div key={index} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FileText size={18} style={{ color: 'var(--accent-primary)' }} />
                        </div>
                        <span style={{ fontSize: '10px', background: 'rgba(37,99,235,0.1)', color: 'var(--accent-primary)', padding: '2px 8px', borderRadius: '99px', fontWeight: 600 }}>Active context</span>
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cv.name}</h4>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Original Profile Document</p>
                      </div>
                      <hr style={{ borderColor: 'var(--card-border)', margin: 0 }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Size: {Math.round(cv.text.length / 100) / 10} KB</span>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button className="tab" onClick={() => handleDownloadCV(cv.name, cv.text)} style={{ padding: '0.25rem', border: 'none', background: 'none', cursor: 'pointer' }} title="Download">
                            <Download size={14} />
                          </button>
                          <button className="tab" onClick={() => handleDuplicateCV(cv)} style={{ padding: '0.25rem', border: 'none', background: 'none', cursor: 'pointer' }} title="Duplicate">
                            <Copy size={14} />
                          </button>
                          <button className="tab" onClick={() => handleRemoveCV(index)} style={{ padding: '0.25rem', border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer' }} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Applications Table Section */}
            <section className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Active Job Applications</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="saas-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>ATS Match</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Apple Inc.</td>
                      <td>Systems Engineer</td>
                      <td>
                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(124, 58, 237, 0.1)', color: 'var(--accent-secondary)', fontWeight: 600 }}>Interviewing</span>
                      </td>
                      <td style={{ fontWeight: 700 }}>88%</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Oct 12, 2023</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Amazon</td>
                      <td>Senior Frontend Developer</td>
                      <td>
                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontWeight: 600 }}>Applied</span>
                      </td>
                      <td style={{ fontWeight: 700 }}>74%</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Oct 09, 2023</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Netflix</td>
                      <td>Cloud Infrastructure Lead</td>
                      <td>
                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(186, 26, 26, 0.1)', color: 'var(--danger)', fontWeight: 600 }}>Rejected</span>
                      </td>
                      <td style={{ fontWeight: 700 }}>62%</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Oct 05, 2023</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

          </div>

          {/* Right Column widgets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Widget 1: Plan Quota */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Usage & Billing</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Customized CV count</span>
                  <span style={{ fontWeight: 600 }}>
                    {userProfile?.plan === 'free' ? `${userProfile.generation_count} / 3` : 'Unlimited'}
                  </span>
                </div>
                {userProfile?.plan === 'free' && (
                  <div style={{ width: '100%', height: '5px', background: 'var(--bg-secondary)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ width: `${(userProfile.generation_count / 3) * 100}%`, height: '100%', background: 'var(--accent-primary)' }}></div>
                  </div>
                )}
              </div>
              <button className="btn btn-primary" onClick={() => setActiveTab('settings')} style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                Manage Subscriptions
              </button>
            </div>

            {/* Widget 2: AI Coach Suggestions */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(124, 58, 237, 0.03)', border: '1px solid rgba(124, 58, 237, 0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-secondary)' }}>
                <Sparkles size={18} />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>AI Workspace Coach</h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '0.75rem' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Your Meta CV target is missing: <strong>distributed architectures</strong> and <strong>quantitative scale</strong> evidence.
                  </p>
                  <button onClick={() => { setIsCustomizing(true); setCustomizerStep(2); }} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 600, padding: '0.4rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.2rem', cursor: 'pointer' }}>
                    Optimize Experience <ArrowRight size={10} />
                  </button>
                </div>

                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '0.75rem' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Stripe applications benefit heavily from <strong>performance metrics ($ / %)</strong>. Ensure project gains are numeric.
                  </p>
                  <button onClick={() => { setIsCustomizing(true); setCustomizerStep(3); }} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 600, padding: '0.4rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.2rem', cursor: 'pointer' }}>
                    Fix Metrics <ArrowRight size={10} />
                  </button>
                </div>
              </div>
            </div>

            {/* Widget 3: Upcoming Events */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Upcoming Events</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', background: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '8px', fontWeight: 600, color: 'var(--text-muted)' }}>OCT</span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, lineHeight: 1, color: 'var(--text-primary)' }}>15</span>
                  </div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>Apple Inc. - Round 1</h5>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>10:00 AM • Virtual Interview</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', background: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '8px', fontWeight: 600, color: 'var(--text-muted)' }}>OCT</span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, lineHeight: 1, color: 'var(--text-primary)' }}>18</span>
                  </div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>Google - Tech Onsite</h5>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>02:30 PM • Google Meet</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    );
  };

  const renderResumesTab = () => {
    const limit = userProfile?.plan === 'free' ? 1 : 5;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} className="entrance-fade">
        <div>
          <h2 style={{ fontSize: '1.6rem', margin: 0, fontWeight: 700 }}>Resume Profile Library</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            Store your baseline CV profiles. The AI automatically references these files to synthesize optimized bullet points. 
            <strong> (Plan Limit: Max {limit} profiles)</strong>.
          </p>
        </div>

        {error && (
          <div className="flex-row-gap" style={{ color: 'var(--danger)', fontSize: '0.85rem', background: 'rgba(255, 59, 48, 0.08)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255, 59, 48, 0.15)' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          
          {/* Upload Area */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '220px' }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.txt,.md"
              multiple
              style={{ display: 'none' }}
            />
            <div className="file-upload-zone" onClick={triggerFileInput} style={{ borderStyle: 'dashed', padding: '2rem' }}>
              <Upload size={28} style={{ margin: '0 auto 0.75rem', color: 'var(--accent-primary)' }} />
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 600 }}>
                {parsingFile ? 'Extracting text...' : 'Drag & Drop your Resumes'}
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Supports PDF, TXT, and Markdown files
              </p>
            </div>
          </div>

          {/* Context CV list */}
          {contextCVs.map((cv, index) => (
            <div key={index} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={20} style={{ color: 'var(--accent-primary)' }} />
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button className="tab" onClick={() => handleDownloadCV(cv.name, cv.text)} style={{ padding: '0.4rem', border: 'none', background: 'none', cursor: 'pointer' }} title="Download markdown source">
                    <Download size={15} />
                  </button>
                  <button className="tab" onClick={() => handleDuplicateCV(cv)} style={{ padding: '0.4rem', border: 'none', background: 'none', cursor: 'pointer' }} title="Duplicate Profile">
                    <Copy size={15} />
                  </button>
                  <button className="tab" onClick={() => handleRemoveCV(index)} style={{ padding: '0.4rem', border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer' }} title="Remove Profile">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cv.name}</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Uploaded profile document
                </p>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <strong>Size:</strong> {Math.round(cv.text.length / 100) / 10} KB • <strong>Lines:</strong> {cv.text.split('\n').length}
              </div>
            </div>
          ))}

        </div>
      </div>
    );
  };

  const renderQuickOptimizeTab = () => {
    const isCVMissing = contextCVs.length === 0;
    const isJDMissing = !jobDescription.trim();
    const isCVSelectedMissing = activeCVIndices.length === 0;
    const canSubmit = !isCVMissing && !isJDMissing && !isCVSelectedMissing && !generating && isKeyConfigured;

    if (generating) {
      return (
        <div className="glass-card font-body-md entrance-fade" style={{ maxWidth: '900px', margin: '2rem auto', padding: '3rem 2rem' }}>
          <div className="scanner-container">
            <div className="radar-sweep">
              <div className="radar-scan-line"></div>
              <div className="radar-grid"></div>
            </div>
            <div className="scanner-text">{loaderText.title}</div>
            <div className="scanner-subtext">{loaderText.desc}</div>
            <button type="button" className="btn btn-secondary" onClick={handleCancel} style={{ width: 'auto', marginTop: '1.5rem', color: 'var(--danger)' }}>
              Cancel Customization
            </button>
          </div>
        </div>
      );
    }

    if (result) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="entrance-fade">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="no-print">
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Optimized Resume Result</h2>
              <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>Review matching keywords, edit markdown, or export PDF.</p>
            </div>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setResult(null)}
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <ArrowLeft size={16} />
              <span>Customize Another</span>
            </button>
          </div>
          <CVDisplay
            result={result}
            onUpdateMarkdown={handleUpdateMarkdown}
            onAutoFix={handleAutoFix}
            userProfile={userProfile}
            jobDescription={jobDescription}
          />
        </div>
      );
    }

    return (
      <div className="entrance-fade" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Header Section */}
        <div>
          <h2 style={{ fontSize: '2.1rem', margin: 0, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Instant CV Customizer
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
            Instantly align your career history to fit any job opening with perfect ATS styling.
          </p>
        </div>

        {/* 1-2-3 Instruction Steps */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start', background: 'var(--card-bg)' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(37,99,235,0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>1</div>
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', fontWeight: 700 }}>Select Profiles</h4>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Check the resumes in the left column to provide your career history context.</p>
            </div>
          </div>
          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start', background: 'var(--card-bg)' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(124,58,237,0.1)', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>2</div>
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', fontWeight: 700 }}>Paste Target JD</h4>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Paste the full text of the job description you are applying for.</p>
            </div>
          </div>
          <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start', background: 'var(--card-bg)' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>3</div>
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', fontWeight: 700 }}>Run AI Customizer</h4>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Set target length or focus area, and hit generate to output optimized resume.</p>
            </div>
          </div>
        </div>

        {/* Split Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'flex-start' }} className="responsive-split">
          
          {/* Left Checkbox List & Quick Upload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem', background: 'var(--card-bg)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} />
                <span>1. Select Resumes ({activeCVIndices.length})</span>
              </h3>

              {/* Upload Dropzone */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="saas-upload-dropzone" style={{ padding: '1rem 0.5rem', minHeight: '100px', cursor: 'pointer' }}>
                  <input 
                    type="file" 
                    accept=".pdf,.txt,.md" 
                    onChange={handleFileUpload} 
                    style={{ display: 'none' }} 
                    multiple 
                  />
                  <Upload size={20} style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }} />
                  <span style={{ fontSize: '11px', fontWeight: 600, display: 'block' }}>Upload Resume Profile</span>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>PDF, TXT, MD up to 10MB</span>
                </label>
              </div>

              {/* Checkboxes */}
              {contextCVs.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', margin: '2rem 0' }}>
                  No resumes uploaded yet. Upload one above.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {contextCVs.map((cv, index) => (
                    <label 
                      key={index} 
                      className="cv-badge" 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem', 
                        padding: '0.75rem', 
                        borderRadius: '8px', 
                        border: activeCVIndices.includes(index) ? '1px solid var(--accent-primary)' : '1px solid var(--card-border)',
                        background: activeCVIndices.includes(index) ? 'rgba(37,99,235,0.02)' : 'transparent',
                        cursor: 'pointer' 
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={activeCVIndices.includes(index)}
                        onChange={() => handleToggleCVIndex(index)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                      />
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }} title={cv.name}>{cv.name}</span>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Baseline Resume</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Checklist */}
            <div className="glass-card" style={{ padding: '1.25rem', background: 'var(--bg-secondary)', border: '1px dashed var(--card-border)' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                <AlertCircle size={14} />
                <span>Setup Checklist</span>
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li style={{ color: contextCVs.length > 0 ? '#10b981' : 'inherit' }}>
                  Upload at least 1 CV profile
                </li>
                <li style={{ color: activeCVIndices.length > 0 ? '#10b981' : 'inherit' }}>
                  Select at least 1 baseline CV checklist
                </li>
                <li style={{ color: jobDescription.trim().length > 0 ? '#10b981' : 'inherit' }}>
                  Paste the target Job Description (JD)
                </li>
              </ul>
            </div>
          </div>

          {/* Right Inputs Area */}
          <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--card-bg)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={16} />
              <span>2. Target Role & Focus</span>
            </h3>

            <div className="form-group">
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Paste Job Description (JD) *</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400 }}>Cmd+Enter / Ctrl+Enter to generate</span>
              </label>
              <textarea
                placeholder="Paste the complete job description of the role you are applying to. This helps the AI extract key skills, keywords, and responsibilities to optimize your resume."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                style={{ minHeight: '220px', fontSize: '0.85rem', lineHeight: '1.5' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="responsive-fields">
              <div className="form-group">
                <label>Future Aspirations / Focus (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Focus on Tech Lead aspects; prioritize React stack."
                  value={aspirations}
                  onChange={(e) => setAspirations(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
              
              <div className="form-group">
                <label>Output Format & Length</label>
                <select
                  value={targetLength}
                  onChange={(e) => setTargetLength(e.target.value as TargetLength)}
                  style={{ fontSize: '0.85rem' }}
                >
                  <option value="1-page">1-Page ATS optimized sheet</option>
                  <option value="2-page">2-Page standard document</option>
                  <option value="3-page">3-Page comprehensive CV profile</option>
                </select>
              </div>
            </div>

            {/* API Key missing notification */}
            {!isKeyConfigured && (
              <div className="flex-row-gap" style={{ color: 'var(--danger)', fontSize: '0.85rem', background: 'rgba(186, 26, 26, 0.08)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <AlertCircle size={16} />
                <span>API Key missing for active provider. Update keys in Settings tab.</span>
              </div>
            )}

            {error && (
              <div className="flex-row-gap" style={{ color: 'var(--danger)', fontSize: '0.85rem', background: 'rgba(255, 59, 48, 0.08)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              style={{ 
                background: 'var(--accent-secondary)', 
                alignSelf: 'flex-end', 
                width: 'auto', 
                padding: '0.75rem 2rem', 
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              disabled={!canSubmit}
            >
              <Sparkles size={16} />
              <span>Generate Optimized CV</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderStepper = () => {
    const isCVMissing = contextCVs.length === 0;
    const isJDMissing = !jobDescription.trim();
    const isCVSelectedMissing = activeCVIndices.length === 0;
    const canSubmit = !isCVMissing && !isJDMissing && !isCVSelectedMissing && !generating && isKeyConfigured;

    return (
      <div className="glass-card font-body-md entrance-fade" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem', marginBottom: '2rem' }} className="no-print">
          <div className={`stepper-step ${customizerStep >= 1 ? 'completed' : ''} ${customizerStep === 1 ? 'active' : ''}`}>
            <span className="stepper-step-number">1</span>
            <span className="font-label-sm">Select Profiles</span>
          </div>
          <div className={`stepper-step ${customizerStep >= 2 ? 'completed' : ''} ${customizerStep === 2 ? 'active' : ''}`}>
            <span className="stepper-step-number">2</span>
            <span className="font-label-sm">Target Role</span>
          </div>
          <div className={`stepper-step ${customizerStep >= 3 ? 'completed' : ''} ${customizerStep === 3 ? 'active' : ''}`}>
            <span className="stepper-step-number">3</span>
            <span className="font-label-sm">Advanced Details</span>
          </div>
          <div className={`stepper-step ${customizerStep >= 4 ? 'completed' : ''} ${customizerStep === 4 ? 'active' : ''}`}>
            <span className="stepper-step-number">4</span>
            <span className="font-label-sm">Verify</span>
          </div>
        </div>

        {/* Step 1: CV Selection */}
        {customizerStep === 1 && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Select Career Context</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Select which resume baseline profiles the LLM will merge to extract relevant experience.
            </p>
            
            {contextCVs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', border: '1.5px dashed var(--card-border)', borderRadius: '12px' }}>
                <FileText size={32} style={{ margin: '0 auto 0.75rem', color: 'var(--text-muted)' }} />
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>You don't have any resume profiles uploaded yet.</p>
                <button className="btn btn-primary" onClick={() => { setIsCustomizing(false); setActiveTab('resumes'); }} style={{ width: 'auto' }}>
                  Upload Profile Resumes
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {contextCVs.map((cv, index) => (
                  <label key={index} className="cv-badge" style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', padding: '1rem', borderRadius: '8px' }}>
                    <input
                      type="checkbox"
                      checked={activeCVIndices.includes(index)}
                      onChange={() => handleToggleCVIndex(index)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                    />
                    <div style={{ flexGrow: 1 }}>
                      <span className="font-semibold" style={{ fontSize: '0.95rem' }}>{cv.name}</span>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Baseline profile</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: JD details */}
        {customizerStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Paste Job Description</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                The LLM maps keywords and experience bullets to match requirements in this text.
              </p>
            </div>
            <textarea
              placeholder="Paste the target JD here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              style={{ minHeight: '260px', fontFamily: 'var(--font-sans)', fontSize: '0.9rem' }}
            />
          </div>
        )}

        {/* Step 3: Secondary focus parameters */}
        {customizerStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Advanced Goals</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Specify aspirations or output page count constraints to guide CV generation.
              </p>
            </div>

            <div className="form-group">
              <label>Future Aspirations (Optional)</label>
              <textarea
                placeholder="e.g. Focus on cloud scale optimizations and database security bullet points."
                value={aspirations}
                onChange={(e) => setAspirations(e.target.value)}
                style={{ minHeight: '100px' }}
              />
            </div>

            <div className="form-group">
              <label>Target Page Length</label>
              <select
                value={targetLength}
                onChange={(e) => setTargetLength(e.target.value as TargetLength)}
              >
                <option value="1-page">1-Page ATS optimized sheet</option>
                <option value="2-page">2-Page standard document</option>
                <option value="3-page">3-Page comprehensive CV profile</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 4: Run Generation */}
        {customizerStep === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Run Customizer Engine</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Double check key settings below before running the generation block.
              </p>
            </div>

            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', padding: '1.25rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Selected context CV count:</span>
                <span style={{ fontWeight: 600 }}>{activeCVIndices.length} profiles</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Output Length:</span>
                <span style={{ fontWeight: 600 }}>{targetLength}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Model engine provider:</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{config.provider.toUpperCase()} ({config.model})</span>
              </div>
            </div>

            {!isKeyConfigured && (
              <div className="flex-row-gap" style={{ color: 'var(--danger)', fontSize: '0.85rem', background: 'rgba(186, 26, 26, 0.08)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <AlertCircle size={16} />
                <span>API Key missing for active provider. Update keys in Settings tab.</span>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Review & Editor */}
        {customizerStep === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {generating && (
              <div className="scanner-container">
                <div className="radar-sweep">
                  <div className="radar-scan-line"></div>
                  <div className="radar-grid"></div>
                </div>
                <div className="scanner-text">{loaderText.title}</div>
                <div className="scanner-subtext">{loaderText.desc}</div>
                <button type="button" className="btn btn-secondary" onClick={handleCancel} style={{ width: 'auto', marginTop: '1rem', color: 'var(--danger)' }}>
                  Cancel Customization
                </button>
              </div>
            )}

            {error && !generating && (
              <div className="flex-row-gap" style={{ color: 'var(--danger)', fontSize: '0.85rem', background: 'rgba(255, 59, 48, 0.08)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {result && !generating && (
              <CVDisplay
                result={result}
                onUpdateMarkdown={handleUpdateMarkdown}
                onAutoFix={handleAutoFix}
                userProfile={userProfile}
                jobDescription={jobDescription}
              />
            )}
          </div>
        )}

        {/* Footer Navigation bar */}
        {customizerStep < 5 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--card-border)', paddingTop: '1.25rem', marginTop: '2rem' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => {
                if (customizerStep > 1) {
                  setCustomizerStep(customizerStep - 1);
                } else {
                  setIsCustomizing(false);
                }
              }}
              style={{ width: 'auto' }}
            >
              {customizerStep === 1 ? 'Exit Customizer' : 'Back'}
            </button>

            {customizerStep < 4 ? (
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => setCustomizerStep(customizerStep + 1)}
                style={{ width: 'auto' }}
                disabled={customizerStep === 1 && activeCVIndices.length === 0}
              >
                Next Step
              </button>
            ) : (
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={async () => {
                  setCustomizerStep(5);
                  await handleGenerate();
                }}
                style={{ width: 'auto', background: 'var(--accent-secondary)' }}
                disabled={!canSubmit}
              >
                Generate ATS Resume
              </button>
            )}
          </div>
        )}

        {customizerStep === 5 && !generating && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--card-border)', paddingTop: '1.25rem', marginTop: '2.5rem' }} className="no-print">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => {
                setIsCustomizing(false);
                setResult(null);
                setCustomizerStep(1);
              }}
              style={{ width: 'auto' }}
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`app-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {renderSidebar()}

      <main className="main-layout">
        {renderTopNav()}

        <div className="main-content">
          {isCustomizing ? renderStepper() : (
            <>
              {activeTab === 'workspace' && renderWorkspaceTab()}
              {activeTab === 'quick-optimize' && renderQuickOptimizeTab()}
              {activeTab === 'resumes' && renderResumesTab()}
              
              {activeTab === 'applications' && (
                <div className="glass-card entrance-fade" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--card-border)' }}>
                    <h2 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 700 }}>Job Applications Tracker</h2>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>View active applications pipeline and interview statuses.</p>
                  </div>
                  <table className="saas-table">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>ATS Match</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Apple Inc.</td>
                        <td>Systems Engineer</td>
                        <td>
                          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(124, 58, 237, 0.1)', color: 'var(--accent-secondary)', fontWeight: 600 }}>Interviewing</span>
                        </td>
                        <td style={{ fontWeight: 700 }}>88%</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Oct 12, 2023</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Amazon</td>
                        <td>Senior Frontend Developer</td>
                        <td>
                          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontWeight: 600 }}>Applied</span>
                        </td>
                        <td style={{ fontWeight: 700 }}>74%</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Oct 09, 2023</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Netflix</td>
                        <td>Cloud Infrastructure Lead</td>
                        <td>
                          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(186, 26, 26, 0.1)', color: 'var(--danger)', fontWeight: 600 }}>Rejected</span>
                        </td>
                        <td style={{ fontWeight: 700 }}>62%</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Oct 05, 2023</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'reports' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="entrance-fade">
                  <div>
                    <h2 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 700 }}>ATS Reports Center</h2>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>Review aggregate dashboard scoring trends and keywords gap recommendations.</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    <div className="glass-card" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(37,99,235,0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>85%</div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Avg Keyword Match</h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Based on last 3 optimizations</p>
                      </div>
                    </div>
                    <div className="glass-card" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(124,58,237,0.1)', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>2/3</div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Interviews Scheduled</h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>66% reply-back rate</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <SettingsPanel
                  config={config}
                  onChangeConfig={handleConfigChange}
                  userProfile={userProfile}
                  onLogout={handleLogout}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
