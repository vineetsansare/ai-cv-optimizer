import { supabase } from './supabase';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
export async function generateCustomizedCV(config, contextCVs, jobDescription, aspirations, targetLength, signal) {
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
export async function autoFixCV(config, currentMarkdown, jobDescription, atsAnalysis, signal) {
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
export async function saveUserAPIKey(provider, apiKey) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session)
        throw new Error('User not authenticated');
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
export async function deleteUserAPIKey(provider) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session)
        throw new Error('User not authenticated');
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
export async function getSavedAPIKeysStatus() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session)
        return { gemini: false, openai: false, anthropic: false };
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
