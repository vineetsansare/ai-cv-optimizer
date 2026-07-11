import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import llmRoutes from './routes/llm.js';
import keyRoutes from './routes/keys.js';

// Load environment variables
dotenv.config();

const fastify = Fastify({
  logger: true
});

// Configure CORS
const allowedOrigins = [
  'http://localhost:5173',
  'https://vineetsansare.github.io'
];

await fastify.register(cors, {
  origin: (origin, cb) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      cb(null, true);
      return;
    }
    const isAllowed = allowedOrigins.some((allowed) => origin.startsWith(allowed));
    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

// Register routes
await fastify.register(llmRoutes, { prefix: '/api/llm' });
await fastify.register(keyRoutes, { prefix: '/api/keys' });

// Health check
fastify.get('/health', async () => {
  return { status: 'healthy', timestamp: new Date().toISOString() };
});

const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const host = process.env.HOST || '0.0.0.0';

try {
  await fastify.listen({ port, host });
  console.log(`Server running at http://${host}:${port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
