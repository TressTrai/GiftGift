import { STORAGE_KEYS } from './constants';

export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
}

export function saveToken(token: string): void {
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
}

export function isTutorialSeen(): boolean {
  return localStorage.getItem(STORAGE_KEYS.TUTORIAL_SEEN) === '1';
}

export function markTutorialSeen(): void {
  localStorage.setItem(STORAGE_KEYS.TUTORIAL_SEEN, '1');
}

export function isSoundEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED) !== '0';
}

export function setSoundEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, enabled ? '1' : '0');
}
