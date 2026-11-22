import type { Ctx } from '../../../_shared';
import { fail } from '../../../_shared';
import { getPasswordSession, passwordCsrfValid, passwordLogoutHeaders, passwordModeEnabled, revokePasswordSession } from '../../../_password_auth';

export const onRequestPost = async ({ request, env }: Ctx) => {
  if (!passwordModeEnabled(env)) return fail('Password sign-in is not enabled.', 404);
  try {
    const session = await getPasswordSession(request, env);
    if (session && !passwordCsrfValid(request, session)) return fail('Invalid secure admin request.', 403);
    await revokePasswordSession(request, env);
    return new Response(JSON.stringify({ ok: true }), { headers: passwordLogoutHeaders() });
  } catch {
    return fail('Password sign-in needs the latest database migration.', 503);
  }
};
