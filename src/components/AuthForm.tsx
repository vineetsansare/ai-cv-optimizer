import React, { useState } from 'react';
import { supabase } from '../utils/supabase';
import { Mail, Lock, User, Sparkles, AlertCircle, ArrowRight, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { AuroraBackground } from './ui/AuroraBackground';
import { LiquidCard } from './ui/LiquidCard';
import { CursorTrailProvider } from './ui/CursorTrailProvider';

interface AuthFormProps {
  onSuccess: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 3D Notebook Page Flip state
  const [flipState, setFlipState] = useState<'idle' | 'out' | 'in'>('idle');

  const triggerModeSwitch = (switchAction: () => void) => {
    setFlipState('out');
    setTimeout(() => {
      switchAction();
      setError(null);
      setSuccess(null);
      setFlipState('in');
      setTimeout(() => setFlipState('idle'), 350);
    }, 180);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isForgotPassword) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        });
        if (resetError) throw resetError;
        setSuccess('Password recovery email sent! Please check your inbox.');
      } else if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (signUpError) throw signUpError;
        if (data.user && data.session === null) {
          setSuccess('Verification email sent! Please check your inbox to confirm your account.');
        } else if (data.session) {
          onSuccess();
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        onSuccess();
      }
    } catch (err: any) {
      console.error('Auth error detail:', err);
      let errMsg = 'Authentication failed';
      if (err && typeof err === 'object') {
        errMsg = err.message || JSON.stringify(err);
      } else if (typeof err === 'string') {
        errMsg = err;
      }
      
      if (errMsg === '{}') {
        errMsg = 'Failed to connect to Supabase. Please ensure your Supabase URL and Anon Key are correct.';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github' | 'linkedin_oidc') => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { error: socialError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });
      if (socialError) throw socialError;
    } catch (err: any) {
      setError(err.message || 'Social login failed');
      setLoading(false);
    }
  };

  const flipClass = flipState === 'out' ? 'flip-out' : flipState === 'in' ? 'flip-in' : '';

  return (
    <CursorTrailProvider>
      <AuroraBackground intensity="vibrant">
        <div style={{
          display: 'flex',
          minHeight: '100vh',
          width: '100vw',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            maxWidth: '1040px',
            width: '100%',
            gap: '2.5rem',
            alignItems: 'center'
          }}>
            {/* Left Showcase Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem' }} className="entrance-fade">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }} className="stagger-1">
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 8px 20px -4px rgba(124, 58, 237, 0.5)'
                }}>
                  <Sparkles size={22} />
                </div>
                <div>
                  <h1 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>JD2CV</h1>
                  <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0, color: 'var(--text-muted)', fontWeight: 700 }}>Career Workspace</p>
                </div>
              </div>

              <div className="stagger-2">
                <h2 style={{ fontSize: '2.4rem', fontWeight: 800, margin: '0 0 0.75rem 0', lineHeight: 1.15, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                  Elevate your career with AI-powered ATS precision.
                </h2>
                <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                  Transform your experience bullet points to match target job descriptions seamlessly.
                </p>
              </div>

              {/* Feature Highlights Card Deck with Slow Vertical Float Drift */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="stagger-3">
                <div className="glass-card float-drift-card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem 1.25rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(124, 58, 237, 0.15)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Zap size={18} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Instant Context Matching</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Extract relevant evidence across multiple uploaded baseline resumes.</p>
                  </div>
                </div>

                <div className="glass-card float-drift-card-delayed" style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem 1.25rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>ATS Score Diagnostics</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Live keyword gap analytics and automated one-click fix recommendations.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Liquid Glass Form Card with 3D Notebook Flip */}
            <div className="perspective-container">
              <LiquidCard
                variant="glass"
                padding="lg"
                hoverEffect={false}
                className={`notebook-card-flip ${flipClass} ${error ? 'error-shake' : ''}`}
                style={{ maxWidth: '440px', width: '100%', margin: '0 auto' }}
              >
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                    {isForgotPassword ? 'Reset Password' : isSignUp ? 'Create Your Account' : 'Welcome Back'}
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                    {isForgotPassword 
                      ? 'Enter your email to receive a recovery link' 
                      : isSignUp ? 'Join the future of ATS customization' : 'Sign in to access your Career Workspace'}
                  </p>
                </div>

            {error && (
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 'var(--border-radius-md)',
                color: '#f87171',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                lineHeight: '1.4'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: 'var(--border-radius-md)',
                color: '#10b981',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                lineHeight: '1.4'
              }}>
                <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {!isForgotPassword && isSignUp && (
                <div className="form-group">
                  <label htmlFor="fullName">Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      id="fullName"
                      type="text"
                      required
                      placeholder="Vineet Sansare"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              {!isForgotPassword && (
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label htmlFor="password" style={{ margin: 0 }}>Password</label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => triggerModeSwitch(() => setIsForgotPassword(true))}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.8rem', padding: 0, cursor: 'pointer' }}
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      id="password"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-glowing"
                disabled={loading}
                style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
              >
                <span>{loading ? 'Processing...' : isForgotPassword ? 'Send Reset Link' : isSignUp ? 'Sign Up' : 'Sign In'}</span>
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            {isForgotPassword ? (
              <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
                <button
                  type="button"
                  onClick={() => triggerModeSwitch(() => setIsForgotPassword(false))}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 600, padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', width: '100%' }}>
                  <div style={{ flexGrow: 1, height: '1px', background: 'var(--card-border)' }} />
                  <span style={{ padding: '0 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>or continue with</span>
                  <div style={{ flexGrow: 1, height: '1px', background: 'var(--card-border)' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn"
                    disabled={loading}
                    onClick={() => handleSocialLogin('google')}
                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.572 0-6.47-2.898-6.47-6.47s2.898-6.47 6.47-6.47c1.558 0 2.977.56 4.1 1.488l3.09-3.09C19.33 2.14 16.02 1 12.24 1 5.67 1 .35 6.32.35 12.89s5.32 11.89 11.89 11.89c7.22 0 11.89-5.08 11.89-12.09 0-.82-.08-1.61-.21-2.4H12.24z"/>
                    </svg>
                    <span>Google</span>
                  </button>

                  <button
                    type="button"
                    className="btn"
                    disabled={loading}
                    onClick={() => handleSocialLogin('github')}
                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                    </svg>
                    <span>GitHub</span>
                  </button>
                </div>

                <button
                  type="button"
                  className="btn"
                  disabled={loading}
                  onClick={() => handleSocialLogin('linkedin_oidc')}
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', marginTop: '0.75rem', width: '100%' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                  <span>Sign in with LinkedIn</span>
                </button>

                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                  </span>
                  <button
                    type="button"
                    onClick={() => triggerModeSwitch(() => setIsSignUp(!isSignUp))}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 600, padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                  </button>
                </div>
              </>
            )}
          </LiquidCard>
        </div>
      </div>
    </div>
    </AuroraBackground>
    </CursorTrailProvider>
  );
};
