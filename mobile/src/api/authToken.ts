// A plain module-level holder for the current auth token, kept in sync by
// authStore. api/client.ts reads from here instead of importing the zustand
// store directly, which avoids a require cycle (client.ts <-> authStore.ts).
let currentToken: string | null = null;
let onSessionEnded: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  currentToken = token;
}

export function getAuthToken(): string | null {
  return currentToken;
}

/** authStore registers this so the API client can sign out a revoked session. */
export function setSessionEndedHandler(fn: () => void) {
  onSessionEnded = fn;
}

export function sessionEnded() {
  onSessionEnded?.();
}
