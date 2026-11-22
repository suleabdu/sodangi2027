/**
 * Optional, single-editor authentication for deployments that explicitly opt
 * out of Cloudflare Access. The password and session signing material are
 * Cloudflare secrets; nothing in this module exposes either one to the browser.
 */

export type PasswordAuthEnv = {
  DB?: D1Database;
  ADMIN_AUTH_MODE?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_SESSION_SECRET?: string;
};

export type PasswordSession = {
  email: string;
  mode: 'password';
  csrfToken: string;
};

type StoredSession = {
  session_hash: string;
  csrf_hash: string;
  actor: string;
  expires_at: number;
  revoked_at: number | null;
};

type LoginAttempt = {
  attempts: number;
  window_started_at: number;
  locked_until: number | null;
};

export const PASSWORD_SESSION_COOKIE = '__Host-sodangi-admin';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const encoder = new TextEncoder();

const base64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return base64Url(new Uint8Array(signature));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

function cookieValue(request: Request, name: string) {
  const prefix = `${name}=`;
  const item = (request.headers.get('cookie') || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return item ? item.slice(prefix.length) : '';
}

function clientAddress(request: Request) {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown-client';
}

function sessionCookie(value: string, maxAge: number) {
  return `${PASSWORD_SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function passwordModeEnabled(env: PasswordAuthEnv) {
  return env.ADMIN_AUTH_MODE === 'password';
}

export function passwordModeConfigured(env: PasswordAuthEnv) {
  return passwordModeEnabled(env) && Boolean(env.DB && env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.length >= 16 && env.ADMIN_SESSION_SECRET && env.ADMIN_SESSION_SECRET.length >= 32);
}

export function passwordAuthConfig(env: PasswordAuthEnv) {
  return {
    mode: passwordModeEnabled(env) ? 'password' : 'access',
    passwordConfigured: passwordModeConfigured(env),
  } as const;
}

async function attemptKey(request: Request, env: PasswordAuthEnv) {
  return hmac(`login:${clientAddress(request)}`, env.ADMIN_SESSION_SECRET || '');
}

export async function loginAllowed(request: Request, env: PasswordAuthEnv) {
  if (!env.DB || !env.ADMIN_SESSION_SECRET) return { allowed: false, retryAfterSeconds: 0 };
  const key = await attemptKey(request, env);
  const current = await env.DB.prepare('SELECT attempts,window_started_at,locked_until FROM admin_login_attempts WHERE attempt_hash=?').bind(key).first<LoginAttempt>();
  const now = Date.now();
  if (current?.locked_until && current.locked_until > now) return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.locked_until - now) / 1000)) };
  return { allowed: true, retryAfterSeconds: 0 };
}

export async function recordFailedLogin(request: Request, env: PasswordAuthEnv) {
  if (!env.DB || !env.ADMIN_SESSION_SECRET) return;
  const key = await attemptKey(request, env);
  const now = Date.now();
  const current = await env.DB.prepare('SELECT attempts,window_started_at,locked_until FROM admin_login_attempts WHERE attempt_hash=?').bind(key).first<LoginAttempt>();
  const inWindow = current && now - current.window_started_at < LOGIN_WINDOW_MS;
  const attempts = inWindow ? current.attempts + 1 : 1;
  const windowStarted = inWindow ? current.window_started_at : now;
  const lockedUntil = attempts >= MAX_LOGIN_ATTEMPTS ? now + LOGIN_LOCK_MS : null;
  await env.DB.prepare(`INSERT INTO admin_login_attempts(attempt_hash,attempts,window_started_at,locked_until)
    VALUES(?,?,?,?) ON CONFLICT(attempt_hash) DO UPDATE SET attempts=excluded.attempts,window_started_at=excluded.window_started_at,locked_until=excluded.locked_until`)
    .bind(key, attempts, windowStarted, lockedUntil).run();
}

export async function clearFailedLogins(request: Request, env: PasswordAuthEnv) {
  if (!env.DB || !env.ADMIN_SESSION_SECRET) return;
  const key = await attemptKey(request, env);
  await env.DB.prepare('DELETE FROM admin_login_attempts WHERE attempt_hash=?').bind(key).run();
}

export async function passwordMatches(candidate: string, env: PasswordAuthEnv) {
  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 16 || candidate.length > 1024) return false;
  const [expected, provided] = await Promise.all([sha256(env.ADMIN_PASSWORD), sha256(candidate)]);
  return constantTimeEqual(expected, provided);
}

async function csrfForSession(sessionToken: string, env: PasswordAuthEnv) {
  return hmac(`csrf:${sessionToken}`, env.ADMIN_SESSION_SECRET || '');
}

export async function createPasswordSession(env: PasswordAuthEnv) {
  if (!passwordModeConfigured(env) || !env.DB || !env.ADMIN_SESSION_SECRET) return null;
  const token = randomToken();
  const csrfToken = await csrfForSession(token, env);
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  await env.DB.prepare(`INSERT INTO admin_sessions(session_hash,csrf_hash,actor,expires_at,created_at,last_seen_at)
    VALUES(?,?,?,?,?,?)`).bind(await sha256(token), await sha256(csrfToken), 'password-admin', expiresAt, now, now).run();
  return { token, csrfToken, expiresAt };
}

export async function getPasswordSession(request: Request, env: PasswordAuthEnv): Promise<PasswordSession | null> {
  if (!passwordModeConfigured(env) || !env.DB || !env.ADMIN_SESSION_SECRET) return null;
  const token = cookieValue(request, PASSWORD_SESSION_COOKIE);
  if (!/^[A-Za-z0-9_-]{40,90}$/.test(token)) return null;
  const sessionHash = await sha256(token);
  const stored = await env.DB.prepare('SELECT session_hash,csrf_hash,actor,expires_at,revoked_at FROM admin_sessions WHERE session_hash=?').bind(sessionHash).first<StoredSession>();
  if (!stored || stored.revoked_at || stored.expires_at <= Date.now()) {
    if (stored) await env.DB.prepare('DELETE FROM admin_sessions WHERE session_hash=?').bind(sessionHash).run();
    return null;
  }
  const csrfToken = await csrfForSession(token, env);
  if (!constantTimeEqual(await sha256(csrfToken), stored.csrf_hash)) return null;
  return { email: stored.actor, mode: 'password', csrfToken };
}

export async function revokePasswordSession(request: Request, env: PasswordAuthEnv) {
  if (!env.DB) return;
  const token = cookieValue(request, PASSWORD_SESSION_COOKIE);
  if (!/^[A-Za-z0-9_-]{40,90}$/.test(token)) return;
  await env.DB.prepare('DELETE FROM admin_sessions WHERE session_hash=?').bind(await sha256(token)).run();
}

export function passwordCsrfValid(request: Request, session: PasswordSession) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) return false;
  return constantTimeEqual(request.headers.get('x-admin-csrf') || '', session.csrfToken);
}

export function passwordLoginHeaders(token: string) {
  return new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'set-cookie': sessionCookie(token, Math.floor(SESSION_TTL_MS / 1000)),
  });
}

export function passwordLogoutHeaders() {
  return new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'set-cookie': sessionCookie('', 0),
  });
}
