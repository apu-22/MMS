import { api } from './api';
import type { AuthResponse, ProfileResponse } from '../types/auth';

export const authService = {
  async register(name: string, email: string, password: string, phone?: string): Promise<AuthResponse> {
    const response = await api.post('/auth/register', { name, email, password, phone });
    return response.data.data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post('/auth/login', { email, password });
    return response.data.data;
  },

  async getMe(): Promise<ProfileResponse> {
    const response = await api.get('/auth/me');
    return response.data.data;
  },
};
