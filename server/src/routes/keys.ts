import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate, supabaseAdmin } from '../utils/auth.js';
import { encrypt } from '../utils/crypto.js';

interface SaveKeyBody {
  provider: 'gemini' | 'openai' | 'anthropic';
  apiKey: string;
}

export default async function keyRoutes(fastify: FastifyInstance) {
  
  // POST /api/keys
  fastify.post('/', async (request: FastifyRequest<{ Body: SaveKeyBody }>, reply: FastifyReply) => {
    const user = await authenticate(request, reply);
    const { provider, apiKey } = request.body;

    if (!apiKey || !apiKey.trim()) {
      return reply.status(400).send({ error: 'API key cannot be empty' });
    }

    try {
      const encrypted = encrypt(apiKey.trim());

      // Upsert the encrypted key
      const { error } = await supabaseAdmin
        .from('user_api_keys')
        .upsert({
          user_id: user.id,
          provider,
          encrypted_key: encrypted
        }, {
          onConflict: 'user_id, provider'
        });

      if (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to save API key to the database' });
      }

      return { success: true, message: `API Key for ${provider} saved successfully.` };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || 'Server error' });
    }
  });

  // GET /api/keys
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await authenticate(request, reply);

    try {
      const { data, error } = await supabaseAdmin
        .from('user_api_keys')
        .select('provider')
        .eq('user_id', user.id);

      if (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to check configured keys' });
      }

      const activeKeys = {
        gemini: false,
        openai: false,
        anthropic: false
      };

      data.forEach((row: any) => {
        if (row.provider === 'gemini') activeKeys.gemini = true;
        if (row.provider === 'openai') activeKeys.openai = true;
        if (row.provider === 'anthropic') activeKeys.anthropic = true;
      });

      return activeKeys;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || 'Server error' });
    }
  });

  // DELETE /api/keys/:provider
  fastify.delete('/:provider', async (request: FastifyRequest<{ Params: { provider: string } }>, reply: FastifyReply) => {
    const user = await authenticate(request, reply);
    const { provider } = request.params;

    if (provider !== 'gemini' && provider !== 'openai' && provider !== 'anthropic') {
      return reply.status(400).send({ error: 'Invalid provider' });
    }

    try {
      const { error } = await supabaseAdmin
        .from('user_api_keys')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', provider);

      if (error) {
        return reply.status(500).send({ error: 'Failed to delete API key' });
      }

      return { success: true, message: `API Key for ${provider} deleted.` };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || 'Server error' });
    }
  });
}
