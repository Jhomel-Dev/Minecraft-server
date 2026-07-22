import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'CraftControl API',
    version: '1.0.0',
    description: 'API documentation for the CraftControl central server.',
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/api/auth/login': {
      post: {
        summary: 'Log in a user',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'user@example.com' },
                  password: { type: 'string', example: 'password123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful' },
          401: { description: 'Invalid credentials' },
          429: { description: 'Too many requests' },
        },
      },
    },
    '/api/auth/register': {
      post: {
        summary: 'Register a new user',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string' },
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User registered successfully' },
          400: { description: 'Bad request (e.g. duplicate user)' },
        },
      },
    },
    '/api/servers': {
      get: {
        summary: 'List all servers for the authenticated user',
        tags: ['Servers'],
        responses: {
          200: { description: 'List of servers' },
          401: { description: 'Unauthorized' },
        },
      },
      post: {
        summary: 'Create a new server instance',
        tags: ['Servers'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string' },
                  version: { type: 'string' },
                  memory: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Server created' },
          500: { description: 'Internal server error' },
        },
      },
    },
    '/api/servers/{id}': {
      delete: {
        summary: 'Delete a server instance',
        tags: ['Servers'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Server deleted' },
          404: { description: 'Server not found' },
        },
      },
    },
    '/api/agent/pair': {
      post: {
        summary: 'Pair a LocalAgent to the user account using a PIN',
        tags: ['Agent'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  pin: { type: 'string', example: '123456' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Agent paired successfully' },
          400: { description: 'Invalid or expired PIN' },
        },
      },
    },
  },
};

const options = {
  swaggerDefinition,
  apis: [], // Keeping controllers pristine (no JSDoc comments inside them)
};

export const swaggerSpec = swaggerJSDoc(options);
