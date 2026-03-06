import type { JWTPayload } from '../services/jwt.service';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      requestId?: string;
      correlationId?: string;
    }
  }
}

export {};
