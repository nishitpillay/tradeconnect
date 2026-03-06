import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { zodToJsonSchema as zodToJsonSchemaRaw } from 'zod-to-json-schema';
import backendPackage from '../../package.json';
import {
  LoginSchema,
  RegisterSchema,
  RequestPhoneOTPSchema,
  VerifyPhoneOTPSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from '../schemas/auth.schema';
import {
  CreateJobSchema,
  PatchJobSchema,
  JobFeedQuerySchema,
  SubmitQuoteSchema,
  QuoteActionSchema,
  AwardJobSchema,
  MyJobsQuerySchema,
} from '../schemas/job.schema';
import {
  CreateConversationSchema,
  SendMessageSchema,
  ListMessagesQuerySchema,
} from '../schemas/messaging.schema';
import {
  AuthRefreshResponseSchema,
  AuthSessionResponseSchema,
  ErrorResponseSchema,
  JobsListResponseSchema,
  MessagesListResponseSchema,
  ValidationErrorResponseSchema,
} from '../contracts/response.schema';

const zodToJsonSchema = zodToJsonSchemaRaw as unknown as (
  schema: unknown,
  options?: Record<string, unknown>
) => Record<string, unknown>;

function schemaRef(name: string) {
  return { $ref: `#/components/schemas/${name}` };
}

function toOpenApiSchema(schema: z.ZodTypeAny, name: string) {
  const jsonSchema = zodToJsonSchema(schema, {
    target: 'openApi3',
    name,
    $refStrategy: 'none',
  }) as { definitions?: Record<string, unknown> } & Record<string, unknown>;

  if (jsonSchema.definitions?.[name]) {
    return jsonSchema.definitions[name];
  }

  return jsonSchema;
}

const schemaMap: Record<string, z.ZodTypeAny> = {
  RegisterInput: RegisterSchema,
  LoginInput: LoginSchema,
  RequestPhoneOtpInput: RequestPhoneOTPSchema,
  VerifyPhoneOtpInput: VerifyPhoneOTPSchema,
  ForgotPasswordInput: ForgotPasswordSchema,
  ResetPasswordInput: ResetPasswordSchema,
  CreateJobInput: CreateJobSchema,
  PatchJobInput: PatchJobSchema,
  JobFeedQuery: JobFeedQuerySchema,
  MyJobsQuery: MyJobsQuerySchema,
  SubmitQuoteInput: SubmitQuoteSchema,
  QuoteActionInput: QuoteActionSchema,
  AwardJobInput: AwardJobSchema,
  CreateConversationInput: CreateConversationSchema,
  SendMessageInput: SendMessageSchema,
  ListMessagesQuery: ListMessagesQuerySchema,
  AuthSessionResponse: AuthSessionResponseSchema,
  AuthRefreshResponse: AuthRefreshResponseSchema,
  JobsListResponse: JobsListResponseSchema,
  MessagesListResponse: MessagesListResponseSchema,
  ErrorResponse: ErrorResponseSchema,
  ValidationErrorResponse: ValidationErrorResponseSchema,
};

const componentsSchemas = Object.fromEntries(
  Object.entries(schemaMap).map(([name, schema]) => [name, toOpenApiSchema(schema, name)])
);

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'TradeConnect API',
    version: backendPackage.version,
    description: 'TradeConnect backend API contract (v1).',
  },
  servers: [{ url: '/api/v1', description: 'Versioned API base path' }],
  tags: [
    { name: 'Auth' },
    { name: 'Jobs' },
    { name: 'Messaging' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: componentsSchemas,
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: schemaRef('RegisterInput') } },
        },
        responses: {
          '201': {
            description: 'Authenticated session',
            content: { 'application/json': { schema: schemaRef('AuthSessionResponse') } },
          },
          '400': {
            description: 'Validation error',
            content: { 'application/json': { schema: schemaRef('ValidationErrorResponse') } },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: schemaRef('LoginInput') } },
        },
        responses: {
          '200': {
            description: 'Authenticated session',
            content: { 'application/json': { schema: schemaRef('AuthSessionResponse') } },
          },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: schemaRef('ErrorResponse') } } },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        responses: {
          '200': {
            description: 'Rotated tokens',
            content: { 'application/json': { schema: schemaRef('AuthRefreshResponse') } },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: schemaRef('ErrorResponse') } } },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { type: 'object', additionalProperties: true },
                  },
                  required: ['user'],
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/jobs': {
      get: {
        tags: ['Jobs'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Customer jobs list',
            content: { 'application/json': { schema: schemaRef('JobsListResponse') } },
          },
        },
      },
      post: {
        tags: ['Jobs'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: schemaRef('CreateJobInput') } },
        },
        responses: {
          '201': { description: 'Job created' },
          '400': { description: 'Validation error' },
        },
      },
    },
    '/jobs/feed': {
      get: {
        tags: ['Jobs'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Provider feed',
            content: { 'application/json': { schema: schemaRef('JobsListResponse') } },
          },
        },
      },
    },
    '/jobs/{id}/quotes': {
      post: {
        tags: ['Jobs'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: schemaRef('SubmitQuoteInput') } },
        },
        responses: { '201': { description: 'Quote created' } },
      },
    },
    '/conversations': {
      get: {
        tags: ['Messaging'],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Conversations list' } },
      },
      post: {
        tags: ['Messaging'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: schemaRef('CreateConversationInput') } },
        },
        responses: { '201': { description: 'Conversation opened' } },
      },
    },
    '/conversations/{id}/messages': {
      get: {
        tags: ['Messaging'],
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Conversation messages',
            content: { 'application/json': { schema: schemaRef('MessagesListResponse') } },
          },
        },
      },
      post: {
        tags: ['Messaging'],
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: schemaRef('SendMessageInput') } },
        },
        responses: { '201': { description: 'Message created' } },
      },
    },
  },
};

const outDir = path.resolve(process.cwd(), 'openapi');
const outFile = path.resolve(outDir, 'openapi.v1.json');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(spec, null, 2)}\n`, 'utf8');
console.log(`OpenAPI written: ${outFile}`);
