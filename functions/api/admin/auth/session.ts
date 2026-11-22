import type { Ctx } from '../../../_shared';
import { fail, json } from '../../../_shared';
import { getPasswordSession, passwordModeEnabled } from '../../../_password_auth';

export const onRequestGet = async ({ request, env }: Ctx) => {
  if (!passwordModeEnabled(env)) return json({ mode: 'access', authenticated: false });
  try {
    const session = await getPasswordSession(request, env);
    if (!session) return json({ mode: 'password', authenticated: false });
    return json({ mode: 'password', authenticated: true, actor: session.email, csrfToken: session.csrfToken });
  } catch {
    return fail('Password sign-in needs the latest database migration.', 503);
  }
};
