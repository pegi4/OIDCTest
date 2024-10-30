import fastify from 'fastify';
import * as dotenv from 'dotenv';
import cors from '@fastify/cors';
import oidc from './routes/oidc';
import { fastifyExpress } from 'fastify-express';
import express from 'express'; 
import bodyParser from 'body-parser';

dotenv.config();

const server = fastify({ logger: false });

// Registriraj fastify-express plugin
server.register(fastifyExpress).then(() => {
  // Po registraciji lahko uporabljaš Express middleware
  
  // Primer uporabe Express body-parser middleware-a
  server.register(bodyParser.json()); // Za obravnavo JSON podatkov
  server.register(bodyParser.urlencoded({ extended: true })); // Za obravnavo x-www-form-urlencoded podatkov
});

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
