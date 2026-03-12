import { getToken } from '../utils/storage';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const error = new Error(err.error ?? 'Network error') as Error & { status: number };
    error.status = res.status;
    throw error;
  }

  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string)                 => request<T>('GET', path),
  post:   <T>(path: string, body: unknown)  => request<T>('POST', path, body),
  patch:  <T>(path: string, body: unknown)  => request<T>('PATCH', path, body),
};
