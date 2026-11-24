// Operations dashboard sign-in.
//
// The prototype has no backend, so the check runs in the browser. The password itself is
// never in the code: only a SHA-256 hash of "email:password" is, read from the build
// environment (VITE_ADMIN_EMAIL, VITE_ADMIN_PASSWORD_HASH). Set them in .env.local for local
// work and in Vercel > Settings > Environment Variables for the live site.
// This keeps casual visitors out of the dashboard; it is not a substitute for server-side
// authentication once the dashboard talks to a real API.

const EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase()
const HASH = (import.meta.env.VITE_ADMIN_PASSWORD_HASH || '').trim().toLowerCase()
const KEY = 'oja-admin-session'
const LOCK_KEY = 'oja-admin-lock'
const SESSION_MS = 8 * 3600 * 1000 // signed out after 8 hours
const MAX_TRIES = 5
const LOCK_MS = 60 * 1000

export const adminAuthConfigured = Boolean(EMAIL && /^[0-9a-f]{64}$/.test(HASH))

const read = (k) => { try { return JSON.parse(sessionStorage.getItem(k) || 'null') } catch { return null } }
const write = (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, JSON.stringify(v)) } catch {} }

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Compare without bailing out on the first different character
const same = (a, b) => a.length === b.length && [...a].reduce((d, c, i) => d | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0

export function getAdminSession() {
  const s = read(KEY)
  if (!s || s.email !== EMAIL || Date.now() - s.at > SESSION_MS) { write(KEY, null); return null }
  return s
}

export function lockedFor() {
  const l = read(LOCK_KEY)
  return l?.until && l.until > Date.now() ? l.until - Date.now() : 0
}

// Resolves to the session, or throws an Error with a message for the form
export async function adminSignIn(email, password) {
  if (!adminAuthConfigured) throw new Error('Sign-in isn\'t set up for this site yet.')
  if (lockedFor()) throw new Error('Too many attempts. Try again in a minute.')
  const e = email.trim().toLowerCase()
  const ok = e === EMAIL && same(await sha256(`${e}:${password}`), HASH)
  if (!ok) {
    const l = read(LOCK_KEY) || { tries: 0 }
    const tries = (l.tries || 0) + 1
    write(LOCK_KEY, tries >= MAX_TRIES ? { tries: 0, until: Date.now() + LOCK_MS } : { tries })
    throw new Error(tries >= MAX_TRIES ? 'Too many attempts. Try again in a minute.' : 'That email and password don\'t match.')
  }
  write(LOCK_KEY, null)
  const session = { email: e, at: Date.now() }
  write(KEY, session)
  return session
}

export function adminSignOut() { write(KEY, null) }
