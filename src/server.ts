import fastify from 'fastify';
import formbody from '@fastify/formbody';
import * as dotenv from 'dotenv';
import cors from '@fastify/cors';
import oidc from './routes/oidc';
import fastifyMultipart from '@fastify/multipart';

dotenv.config();

const server = fastify({ logger: false });

server.register(formbody);
server.register(fastifyMultipart);

server.register(cors, {
  origin: '*',
  credentials: false,
});

server.get('/', async (request, reply) => {
  return { hello: 'world' };
});

server.register(oidc);

const start = async () => {
  try {
    await server.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server is running at ', process.env.HOST);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
