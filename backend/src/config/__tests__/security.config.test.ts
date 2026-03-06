import {
  buildHelmetConfig,
  buildCorsOptions,
  isOriginAllowed,
  parseOriginList,
  resolveCorsAllowedOrigins,
} from '../security';

describe('security config', () => {
  it('parses origin csv and normalizes trailing slashes', () => {
    const origins = parseOriginList('http://localhost:3001/, https://app.tradeconnect.com.au/');
    expect(origins).toEqual([
      'http://localhost:3001',
      'https://app.tradeconnect.com.au',
    ]);
  });

  it('uses env-specific CORS origins when present', () => {
    const allowlist = resolveCorsAllowedOrigins({
      NODE_ENV: 'production',
      CORS_ORIGINS: 'http://localhost:3001',
      CORS_ORIGINS_PRODUCTION: 'https://app.tradeconnect.com.au,https://admin.tradeconnect.com.au',
    });

    expect(allowlist).toEqual([
      'https://app.tradeconnect.com.au',
      'https://admin.tradeconnect.com.au',
    ]);
  });

  it('allows missing origin for non-browser calls', () => {
    expect(isOriginAllowed(undefined, ['https://app.tradeconnect.com.au'])).toBe(true);
  });

  it('blocks origin not in allowlist', () => {
    expect(isOriginAllowed('https://evil.example', ['https://app.tradeconnect.com.au'])).toBe(false);
  });

  it('cors callback rejects disallowed origins', () => {
    const options = buildCorsOptions(['https://app.tradeconnect.com.au']);
    const originFn = options.origin as (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => void;

    let callbackError: Error | null = null;
    let allowed: boolean | undefined;

    originFn('https://evil.example', (err, allow) => {
      callbackError = err;
      allowed = allow;
    });

    expect(callbackError).toBeInstanceOf(Error);
    expect(allowed).toBeUndefined();
  });

  it('builds stricter helmet config with production hsts', () => {
    const helmetConfig = buildHelmetConfig('production', ['https://app.tradeconnect.com.au']);
    expect(helmetConfig.hsts).toBeTruthy();
    const csp = helmetConfig.contentSecurityPolicy;
    expect(csp).toBeTruthy();
    if (!csp || csp === true) return;
    const connectSrc = csp.directives?.connectSrc as string[] | undefined;
    expect(connectSrc).toContain('https://app.tradeconnect.com.au');
  });
});
