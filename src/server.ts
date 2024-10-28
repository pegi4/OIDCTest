import Fastify from 'fastify';
import * as dotenv from 'dotenv';
import oidc from './routes/oidc';

dotenv.config();

const server = Fastify({ logger: false });

server.get('/', async (request, reply) => {
  return { hello: 'world' };
});

server.register(oidc);

const start = async () => {
  try {
    await server.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server is running at http://localhost:3000');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
