import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';
import type { FastifyRequest, FastifyReply } from 'fastify';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase env variables are missing in the backend! Database features will not work.');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

export interface AuthenticatedUser {
  id: string;
  email: string;
  plan: 'free' | 'byok' | 'pro';
  generationCount: number;
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<AuthenticatedUser> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send({ error: 'Missing or invalid authorization token' });
    throw new Error('Unauthorized');
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    reply.status(401).send({ error: 'Invalid user session or token' });
    throw new Error('Unauthorized');
  }

  // Fetch the user's profile to get their plan and generation count
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('plan, generation_count')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    reply.status(500).send({ error: 'Failed to retrieve user profile' });
    throw new Error('Database Error');
  }

  return {
    id: user.id,
    email: user.email || '',
    plan: profile.plan as 'free' | 'byok' | 'pro',
    generationCount: profile.generation_count || 0
  };
}
