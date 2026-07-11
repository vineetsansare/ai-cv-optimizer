import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../utils/auth.js';
import { decrypt } from '../utils/crypto.js';
import { generateCustomizedCVServer, autoFixCVServer } from '../services/llm.js';
import { supabaseAdmin } from '../utils/auth.js';
import type { TargetLength, ATSAnalysis } from '../types.js';

interface GenerateBody {
  provider: 'gemini' | 'openai' | 'anthropic';
  model: string;
  contextCVs: { name: string; text: string }[];
  jobDescription: string;
  aspirations: string;
  targetLength: TargetLength;
}

interface AutoFixBody {
  provider: 'gemini' | 'openai' | 'anthropic';
  model: string;
  currentMarkdown: string;
  jobDescription: string;
  atsAnalysis: ATSAnalysis;
}

export default async function llmRoutes(fastify: FastifyInstance) {
  
  // POST /api/llm/generate
  fastify.post('/generate', async (request: FastifyRequest<{ Body: GenerateBody }>, reply: FastifyReply) => {
    const user = await authenticate(request, reply);
    const { provider, model, contextCVs, jobDescription, aspirations, targetLength } = request.body;

    // Determine the API Key based on user plan
    let apiKey = '';

    if (user.plan === 'byok') {
      // Fetch user's own key
      const { data, error } = await supabaseAdmin
        .from('user_api_keys')
        .select('encrypted_key')
        .eq('user_id', user.id)
        .eq('provider', provider)
        .single();

      if (error || !data) {
        return reply.status(400).send({ error: `API key for provider '${provider}' is not configured. Please save it in settings.` });
      }

      try {
        apiKey = decrypt(data.encrypted_key);
      } catch (err) {
        return reply.status(500).send({ error: 'Failed to decrypt your stored API key.' });
      }
    } else if (user.plan === 'pro') {
      // Use platform key
      apiKey = getPlatformApiKey(provider);
    } else {
      // Free plan: Limit to 3 generations
      if (user.generationCount >= 3) {
        return reply.status(402).send({ 
          error: 'Free trial limit reached (3 generations max). Please upgrade to Pro or enter your own API Key to continue using the app.',
          limitReached: true
        });
      }
      apiKey = getPlatformApiKey(provider);
    }

    if (!apiKey) {
      return reply.status(500).send({ error: `Platform API key for '${provider}' is not configured on the server.` });
    }

    try {
      const result = await generateCustomizedCVServer(
        { provider, model, apiKey },
        contextCVs,
        jobDescription,
        aspirations,
        targetLength
      );

      // Increment generation count for free users and log all generations
      if (user.plan === 'free') {
        await supabaseAdmin
          .from('profiles')
          .update({ generation_count: user.generationCount + 1 })
          .eq('id', user.id);
      }

      // Log generation history
      await supabaseAdmin.from('generations').insert({
        user_id: user.id,
        job_description: jobDescription,
        aspirations,
        target_length: targetLength,
        cv_markdown: result.cvMarkdown,
        cover_letter: result.coverLetter,
        ats_score: result.atsScore,
        ats_analysis: result.atsAnalysis,
        human_changes: result.humanFriendlyChanges,
        provider_used: provider,
        model_used: model
      });

      return result;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: error.message || 'Generation failed' });
    }
  });

  // POST /api/llm/auto-fix
  fastify.post('/auto-fix', async (request: FastifyRequest<{ Body: AutoFixBody }>, reply: FastifyReply) => {
    const user = await authenticate(request, reply);
    const { provider, model, currentMarkdown, jobDescription, atsAnalysis } = request.body;

    let apiKey = '';

    if (user.plan === 'byok') {
      const { data, error } = await supabaseAdmin
        .from('user_api_keys')
        .select('encrypted_key')
        .eq('user_id', user.id)
        .eq('provider', provider)
        .single();

      if (error || !data) {
        return reply.status(400).send({ error: `API key for provider '${provider}' not found.` });
      }

      apiKey = decrypt(data.encrypted_key);
    } else {
      // Pro & Free (Auto-fix is enabled for Free trial as well, counting as part of usage)
      if (user.plan === 'free' && user.generationCount >= 3) {
        return reply.status(402).send({ error: 'Free trial limit reached. Please upgrade to use Auto-Fix.' });
      }
      apiKey = getPlatformApiKey(provider);
    }

    if (!apiKey) {
      return reply.status(500).send({ error: `API key for '${provider}' is not available.` });
    }

    try {
      const result = await autoFixCVServer(
        { provider, model, apiKey },
        currentMarkdown,
        jobDescription,
        atsAnalysis
      );

      // Increment count for free users if this triggers a rewrite log
      if (user.plan === 'free') {
        await supabaseAdmin
          .from('profiles')
          .update({ generation_count: user.generationCount + 1 })
          .eq('id', user.id);
      }

      return result;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: error.message || 'Auto-fix failed' });
    }
  });
}

function getPlatformApiKey(provider: string): string {
  if (provider === 'gemini') return process.env.GEMINI_API_KEY || '';
  if (provider === 'openai') return process.env.OPENAI_API_KEY || '';
  if (provider === 'anthropic') return process.env.ANTHROPIC_API_KEY || '';
  return '';
}
