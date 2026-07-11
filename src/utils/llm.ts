import { supabase } from './supabase';

export interface LLMConfig {
  provider: 'gemini' | 'openai' | 'anthropic';
  apiKey: string;
  model: string;
}

export interface ATSAnalysis {
  matchedKeywords: string[];
  missingKeywords: string[];
  strengths: string[];
  weaknesses: string[];
  actionItems: string[];
}

export interface CVGenerationResult {
  cvMarkdown: string;
  atsScore: number;
  atsAnalysis: ATSAnalysis;
  humanFriendlyChanges: string[];
  coverLetter: string;
}

export type TargetLength = '1-page' | '2-page' | 'comprehensive';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export async function generateCustomizedCV(
  config: LLMConfig,
  contextCVs: { name: string; text: string }[],
  jobDescription: string,
  aspirations: string,
  targetLength: TargetLength,
  signal?: AbortSignal
): Promise<CVGenerationResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('You must be signed in to perform this action.');
  }

  const response = await fetch(`${BACKEND_URL}/api/llm/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      provider: config.provider,
      model: config.model,
      contextCVs,
      jobDescription,
      aspirations,
      targetLength
    }),
    signal
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function autoFixCV(
  config: LLMConfig,
  currentMarkdown: string,
  jobDescription: string,
  atsAnalysis: ATSAnalysis,
  signal?: AbortSignal
): Promise<CVGenerationResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('You must be signed in to perform this action.');
  }

  const response = await fetch(`${BACKEND_URL}/api/llm/auto-fix`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      provider: config.provider,
      model: config.model,
      currentMarkdown,
      jobDescription,
      atsAnalysis
    }),
    signal
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Auto-fix request failed with status ${response.status}`);
  }

  return response.json();
}

// Client-side helper for managing user-configured keys in the database (BYOK)
export async function saveUserAPIKey(provider: 'gemini' | 'openai' | 'anthropic', apiKey: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('User not authenticated');

  const response = await fetch(`${BACKEND_URL}/api/keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ provider, apiKey })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to save API key');
  }
}

export async function deleteUserAPIKey(provider: 'gemini' | 'openai' | 'anthropic'): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('User not authenticated');

  const response = await fetch(`${BACKEND_URL}/api/keys/${provider}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete API key');
  }
}

export async function getSavedAPIKeysStatus(): Promise<{ gemini: boolean; openai: boolean; anthropic: boolean }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { gemini: false, openai: false, anthropic: false };

  const response = await fetch(`${BACKEND_URL}/api/keys`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    }
  });

  if (!response.ok) {
    return { gemini: false, openai: false, anthropic: false };
  }

  return response.json();
}
