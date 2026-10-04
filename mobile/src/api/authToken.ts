// A plain module-level holder for the current auth token, kept in sync by
// authStore. api/client.ts reads from here instead of importing the zustand
// store directly, which avoids a require cycle (client.ts <-> authStore.ts).
let currentToken: string | null = null;

export function setAuthToken(token: string | null) {
  currentToken = token;
}

export function getAuthToken(): string | null {
  return currentToken;
}
