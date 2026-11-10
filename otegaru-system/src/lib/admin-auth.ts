import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

// Shared authentication helpers for the admin area (/kanri-5279).
// Server-only module: it reads request cookies and the ADMIN_USER /
// ADMIN_PASSWORD environment variables, and must never be imported
// from a Client Component.

export const SESSION_COOKIE_NAME = 'otegaru_admin_session'

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function getAdminUser(): string {
  return process.env.ADMIN_USER || 'admin'
}

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || 'password'
}

// ---------------------------------------------------------------------------
// Credential verification (constant-time)
// ---------------------------------------------------------------------------

function sha256(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest()
}

// Constant-time string comparison: both sides are hashed to fixed-length
// SHA-256 digests first, so timingSafeEqual never throws on length mismatch
// and the comparison does not leak the expected value's length.
export function secureCompare(actual: string, expected: string): boolean {
  return timingSafeEqual(sha256(actual), sha256(expected))
}

export function verifyCredentials(username: string, password: string): boolean {
  // Evaluate both comparisons before branching so a wrong username is not
  // distinguishable by timing.
  const userOk = secureCompare(username, getAdminUser())
  const passwordOk = secureCompare(password, getAdminPassword())
  return userOk && passwordOk
}

// ---------------------------------------------------------------------------
// Session token (stateless, HMAC-SHA256 signed)
// ---------------------------------------------------------------------------

type SessionPayload = {
  u: string // username
  exp: number // expiry, epoch milliseconds
}

function signingKey(): Buffer {
  // The signing key is derived from the admin password, so changing
  // ADMIN_PASSWORD automatically invalidates all existing sessions.
  return createHash('sha256')
    .update(`otegaru-admin-session:${getAdminPassword()}`, 'utf8')
    .digest()
}

function sign(data: string): string {
  return createHmac('sha256', signingKey()).update(data, 'utf8').digest('base64url')
}

export function createSessionToken(username: string): string {
  const payload: SessionPayload = {
    u: username,
    exp: Date.now() + SESSION_TTL_MS,
  }
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  return `${body}.${sign(body)}`
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null
  const body = token.slice(0, dot)
  const signature = token.slice(dot + 1)

  const expected = sign(body)
  const signatureBuf = Buffer.from(signature, 'utf8')
  const expectedBuf = Buffer.from(expected, 'utf8')
  if (signatureBuf.length !== expectedBuf.length || !timingSafeEqual(signatureBuf, expectedBuf)) {
    return null
  }

  let payload: SessionPayload
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (typeof payload?.u !== 'string' || typeof payload?.exp !== 'number') return null
  if (payload.exp <= Date.now()) return null
  if (!secureCompare(payload.u, getAdminUser())) return null
  return payload
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    expires: new Date(Date.now() + SESSION_TTL_MS),
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  })
}

// ---------------------------------------------------------------------------
// Session checks
// ---------------------------------------------------------------------------

export async function getAdminSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  return verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value)
}

export async function isAdmin(): Promise<boolean> {
  return (await getAdminSession()) !== null
}

// Guard for admin-only Server Actions: returns true when the caller holds a
// valid admin session.
export async function requireAdmin(): Promise<boolean> {
  return isAdmin()
}

// ---------------------------------------------------------------------------
// Failed-login throttling (best-effort, in-memory)
// ---------------------------------------------------------------------------

const FAILURE_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const MAX_FAILURES = 5
const LOCK_DURATION_MS = 10 * 60 * 1000 // 10 minutes

// Module-level state: shared per server process. On serverless platforms an
// instance restart resets it, so this is a best-effort brake, not a hard
// guarantee — it still removes unlimited password guessing.
const throttle = {
  failures: [] as number[],
  lockedUntil: 0,
}

export function isLoginLocked(): boolean {
  return throttle.lockedUntil > Date.now()
}

export function recordLoginFailure(): void {
  const now = Date.now()
  throttle.failures = throttle.failures.filter((t) => now - t < FAILURE_WINDOW_MS)
  throttle.failures.push(now)
  if (throttle.failures.length >= MAX_FAILURES) {
    throttle.lockedUntil = now + LOCK_DURATION_MS
    throttle.failures = []
  }
}

export function clearLoginFailures(): void {
  throttle.failures = []
  throttle.lockedUntil = 0
}
