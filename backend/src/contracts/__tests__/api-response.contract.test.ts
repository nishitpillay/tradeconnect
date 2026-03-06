import {
  AuthRefreshResponseSchema,
  AuthSessionResponseSchema,
  JobsListResponseSchema,
  MessagesListResponseSchema,
  ValidationErrorResponseSchema,
} from '../response.schema';

describe('API response contracts', () => {
  it('validates auth session responses', () => {
    const payload = {
      user: {
        id: '3adf2ff2-267a-4df9-92fd-e9050cc9eb55',
        email: 'customer@example.com',
        role: 'customer',
        status: 'active',
        full_name: 'Customer Demo',
        email_verified: true,
        phone_verified: false,
        created_at: '2026-01-01T00:00:00.000Z',
      },
      access_token: 'access-token',
      csrf_token: 'csrf-token',
    };

    expect(AuthSessionResponseSchema.safeParse(payload).success).toBe(true);
  });

  it('validates auth refresh responses', () => {
    const payload = {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      csrf_token: 'csrf-token',
    };

    expect(AuthRefreshResponseSchema.safeParse(payload).success).toBe(true);
  });

  it('validates jobs list responses', () => {
    const payload = {
      jobs: [
        {
          id: 'job-1',
          title: 'Fix a bathroom leak',
          status: 'posted',
          category_id: 'cat-1',
        },
      ],
      nextCursor: 'cursor-1',
    };

    expect(JobsListResponseSchema.safeParse(payload).success).toBe(true);
  });

  it('validates messages list responses', () => {
    const payload = {
      messages: [
        {
          id: 'msg-1',
          conversation_id: 'conv-1',
          sender_id: 'user-1',
          message_type: 'text',
          body: 'Hello',
          created_at: '2026-01-02T12:00:00.000Z',
        },
      ],
    };

    expect(MessagesListResponseSchema.safeParse(payload).success).toBe(true);
  });

  it('validates validation-error payload shape', () => {
    const payload = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request body validation failed.',
        details: {
          fields: [
            {
              path: 'email',
              message: 'Must be a valid email address',
            },
          ],
        },
      },
    };

    expect(ValidationErrorResponseSchema.safeParse(payload).success).toBe(true);
  });
});

