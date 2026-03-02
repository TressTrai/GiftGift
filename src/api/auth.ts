import { api } from './client';
import { AuthSession } from '../types';

export function register(name: string, password: string): Promise<AuthSession> {
  return api.post<AuthSession>('/auth/register', { name, password });
}

export function login(name: string, password: string): Promise<AuthSession> {
  return api.post<AuthSession>('/auth/login', { name, password });
}

export function updateName(name: string): Promise<void> {
  return api.patch<void>('/auth/name', { name });
}

export function updatePassword(oldPassword: string, newPassword: string): Promise<void> {
  return api.patch<void>('/auth/password', { oldPassword, newPassword });
}
