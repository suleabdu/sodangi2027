import type { Ctx } from '../../../_shared';
import { fail } from '../../../_shared';
import {
  clearFailedLogins,
  createPasswordSession,
  loginAllowed,
  passwordLoginHeaders,
  passwordMatches,
  passwordModeConfigured,
  passwordModeEnabled,
  recordFailedLogin,
} from '../../../_password_auth';

const response = (data: unknown, headers: Headers, status = 200) => new Response(JSON.stringify(data), { status, headers });

export const onRequestPost = async ({ request, env }: Ctx) => {
  if (!passwordModeEnabled(env)) return fail('Password sign-in is not enabled.', 404);
  if (!passwordModeConfigured(env)) return fail('Password sign-in is not configured. Add the required Cloudflare secrets.', 503);
  if (Number(request.headers.get('content-length') || 0) > 2_000) return fail('Sign-in request is too large.', 413);
  const body = await request.json().catch(() => null) as { password?: unknown } | null;
  const password = typeof body?.password === 'string' ? body.password : '';
  try {
    const allowed = await loginAllowed(request, env);
    if (!allowed.allowed) {
      const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'retry-after': String(allowed.retryAfterSeconds), 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
      return new Response(JSON.stringify({ error: 'Too many sign-in attempts. Try again later.' }), { status: 429, headers });
    }
    if (!await passwordMatches(password, env)) {
      await recordFailedLogin(request, env);
      return fail('Invalid sign-in details.', 401);
    }
    await clearFailedLogins(request, env);
    const session = await createPasswordSession(env);
    if (!session) return fail('Password sign-in could not be started.', 503);
    return response({ ok: true, actor: 'password-admin', csrfToken: session.csrfToken, expiresAt: session.expiresAt }, passwordLoginHeaders(session.token));
  } catch {
    return fail('Password sign-in needs the latest database migration.', 503);
  }
};
