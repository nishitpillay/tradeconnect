import { z } from 'zod';

const webEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_API_BASE_URL: z
    .string()
    .url('NEXT_PUBLIC_API_BASE_URL must be a valid URL')
    .refine((value) => value.endsWith('/api'), {
      message: 'NEXT_PUBLIC_API_BASE_URL must end with /api',
    }),
});

type WebEnv = z.infer<typeof webEnvSchema>;

function parseWebEnv(source: NodeJS.ProcessEnv): WebEnv {
  const parsed = webEnvSchema.safeParse(source);
  if (parsed.success) return parsed.data;

  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  throw new Error(`Web environment configuration is invalid:\n${issues}`);
}

export const webEnv = parseWebEnv(process.env);
