import type { Request, Response, NextFunction } from 'express';
import { requireRefreshCsrf } from '../csrf.middleware';

describe('requireRefreshCsrf', () => {
  function mockRes() {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    return res;
  }

  it('allows native clients using body refresh token without cookie', () => {
    const req = {
      cookies: {},
      get: jest.fn(),
    } as unknown as Request;
    const res = mockRes();
    const next: NextFunction = jest.fn();

    requireRefreshCsrf(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((res.status as jest.Mock)).not.toHaveBeenCalled();
  });

  it('blocks when cookie flow has no csrf header', () => {
    const req = {
      cookies: { refresh_token: 'abc', csrf_token: 'csrf-cookie' },
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as Request;
    const res = mockRes();
    const next: NextFunction = jest.fn();

    requireRefreshCsrf(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows when csrf header matches csrf cookie', () => {
    const req = {
      cookies: { refresh_token: 'abc', csrf_token: 'csrf-cookie' },
      get: jest.fn().mockImplementation((k: string) => (k === 'x-csrf-token' ? 'csrf-cookie' : undefined)),
    } as unknown as Request;
    const res = mockRes();
    const next: NextFunction = jest.fn();

    requireRefreshCsrf(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
