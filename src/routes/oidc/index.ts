import { FastifyPluginAsync } from 'fastify';
import type { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { randomUUID } from 'crypto';
import { fastifyFormbody } from '@fastify/formbody';

interface SessionData {
  [key: string]: {
    issued: boolean;
    accessToken?: string;
    credentialOfferData?: object;
  };
}

const oidc: FastifyPluginAsyncJsonSchemaToTs = async (fastify): Promise<void> => {

  const sessionData: SessionData = {};

  // Endpoint for OpenID Credential Issuer Metadata
  fastify.get('/.well-known/openid-credential-issuer', async (request, reply) => {
    const issuerUrl = process.env.HOST || 'http://localhost:3000';
    
    reply
      .header('Content-Type', 'application/json')
      .send({
        credential_issuer: issuerUrl,
        credential_formats: ['jwt_vc_json'],
        grant_types_supported: ['urn:ietf:params:oauth:grant-type:pre-authorized_code'],
        token_endpoint: `${issuerUrl}/token`,
        authorization_server: issuerUrl,
        credential_endpoint: `${issuerUrl}/credential`,
      });
  });

  fastify.get('/.well-known/openid-configuration', async (request, reply) => {
    const issuerUrl = process.env.HOST || 'http://localhost:3000';
    return reply.send({
      credential_issuer: issuerUrl,
      token_endpoint: `${issuerUrl}/token`,
    });
  });
  

  // Endpoint to create a credential offer
  fastify.post('/credential-offer', async (request, reply) => {
    console.log('Registering /credential-offer');
    const preAuthorizedCode = Math.random().toString(36).substr(2, 9);
    sessionData[preAuthorizedCode] = { issued: false };
  
    const credentialOfferData = {
      credential_issuer: process.env.HOST || 'http://localhost:3000',
      credentials: [
        {
          format: 'jwt_vc_json',
          types: ['VerifiableCredential', 'TicketCredential'],
        },
      ],
      grants: {
        'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
          pre_authorized_code: preAuthorizedCode,
          user_pin_required: false,
        },
      },
    };
  
    sessionData[preAuthorizedCode].credentialOfferData = credentialOfferData;
    const credentialOfferURI = `openid-credential-offer://?credential_offer_uri=${encodeURIComponent(
      `${process.env.HOST}/credential-offer-data/${preAuthorizedCode}`
    )}`;
  
    console.log("Generated Credential Offer URI:", credentialOfferURI);
  
    return reply.send({credentialOfferURI});
  });

  // Endpoint to serve the credential offer data
  fastify.get('/credential-offer-data/:code', async (request, reply) => {
    const { code } = request.params as { code: string };
    const offerData = sessionData[code]?.credentialOfferData;
  
    if (offerData) {
      return reply.send(offerData);
    } else {
      return reply.status(404).send({ error: 'Credential offer not found' });
    }
  });

  // Token endpoint to issue an access token
  fastify.post('/token', async (request, reply) => {
    console.log('Token endpoint hit');
  
    // Log request headers
    console.log('Request headers:', request.headers);
  
    // Log request body
    console.log('Request body:', request.body);
  
    const { 'pre-authorized_code': preAuthorizedCode } = request.body as {
      'pre-authorized_code': string;
    };
  
    console.log(`Received pre-authorized code: ${preAuthorizedCode}`);

    console.log("Session Data:", sessionData);
  
    // Check if the preAuthorizedCode is in session data
    if (sessionData[preAuthorizedCode]) {
      const accessToken = `access-token-${preAuthorizedCode}`;
      sessionData[preAuthorizedCode].accessToken = accessToken;
  
      // Log generated access token
      console.log(`Generated and stored access token: ${accessToken}`);
  
      // Set response headers (optional, only if you want to customize)
      reply.header('Content-Type', 'application/json; charset=utf-8');
      reply.header('Access-Control-Allow-Origin', '*');
  
      // Log response headers
      console.log('Response headers:', reply.getHeaders());
  
      // Log response body before sending
      const responseBody = { access_token: accessToken };
      console.log('Response body:', responseBody);
  
      // Send response
      return reply.send(responseBody);
    } else {
      // Log unauthorized response
      console.log('Unauthorized access or token already issued');
  
      // Set status and response headers for 401
      reply.status(401).header('Content-Type', 'application/json; charset=utf-8');
  
      // Log response headers
      console.log('Response headers for 401:', reply.getHeaders());
  
      // Log response body before sending
      const responseBody = { error: 'Unauthorized or token already issued' };
      console.log('Response body for 401:', responseBody);
  
      // Send 401 response
      return reply.send(responseBody);
    }
  });
  

  // Credential issuance endpoint to return the VC
  fastify.post('/credential', async (request, reply) => {
    const authorization = request.headers.authorization;
    if (!authorization) {
      return reply.status(401).send({ error: 'Authorization header missing' });
    }
  
    const accessToken = authorization.split(' ')[1];
    console.log(`Received access token: ${accessToken}`);
  
    // Log the current sessionData for debugging
    console.log(`Current sessionData: ${JSON.stringify(sessionData)}`);

    const session = Object.values(sessionData).find(
      (session) => session.accessToken === accessToken
    );
  
    if (session) {
      const credential = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        "id": `urn:uuid:${randomUUID()}`,
        "type": ["VerifiableCredential", "TicketCredential"],
        "issuer": "did:example:issuer-did",
        "credentialSubject": {
          "id": "did:example:subject-did",
          "eventName": "Test Event",
          "ticketNumber": "12345",
          "seat": "A1"
        },
        "issuanceDate": new Date().toISOString(),
        "proof": {
          "type": "EcdsaSecp256k1Signature2019",
          "created": new Date().toISOString(),
          "proofPurpose": "assertionMethod",
          "verificationMethod": "did:example:issuer-did#key-1",
          "jws": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0..."
        }
      };
  
      console.log(`Issuing credential: ${JSON.stringify(credential)}`);
      return reply.send({ credential });
    } else {
      fastify.log.warn(`No session found for access token: ${accessToken}`);
      return reply.status(401).send({ error: 'Invalid token or unauthorized' });
    }
  });

};

export default oidc;
