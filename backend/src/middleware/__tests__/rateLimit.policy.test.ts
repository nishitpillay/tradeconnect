import { rateLimitPolicyMatrix } from '../rateLimit.middleware';

describe('rate limit policy matrix', () => {
  it('includes critical security routes', () => {
    const routes = rateLimitPolicyMatrix.map((item) => item.route);
    expect(routes).toContain('POST /api/v1/auth/login');
    expect(routes).toContain('POST /api/v1/auth/phone/request-otp');
    expect(routes).toContain('GET /api/v1/jobs/feed');
  });

  it('keeps login and otp stricter than feed browsing', () => {
    const login = rateLimitPolicyMatrix.find((item) => item.route === 'POST /api/v1/auth/login');
    const otp = rateLimitPolicyMatrix.find((item) => item.route === 'POST /api/v1/auth/phone/request-otp');
    const feed = rateLimitPolicyMatrix.find((item) => item.route === 'GET /api/v1/jobs/feed');

    expect(login).toBeDefined();
    expect(otp).toBeDefined();
    expect(feed).toBeDefined();

    if (!login || !otp || !feed) return;

    const loginPerHour = (login.limit / login.windowSeconds) * 3600;
    const otpPerHour = (otp.limit / otp.windowSeconds) * 3600;
    const feedPerHour = (feed.limit / feed.windowSeconds) * 3600;

    expect(loginPerHour).toBeLessThan(feedPerHour);
    expect(otpPerHour).toBeLessThan(feedPerHour);
  });
});

