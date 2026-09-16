import { api } from './api';
import type { Mess, Member, CreateMessInput, JoinMessResult } from '../types/mess';

export const messService = {
  async createMess(input: CreateMessInput): Promise<Mess> {
    const response = await api.post('/messes', input);
    return response.data.data;
  },

  async joinMess(inviteCode: string): Promise<JoinMessResult> {
    const response = await api.post('/messes/join', { inviteCode });
    return response.data.data;
  },

  async getDetails(messId: number): Promise<Mess> {
    const response = await api.get(`/messes/${messId}`);
    return response.data.data;
  },

  async getMembers(messId: number): Promise<Member[]> {
    const response = await api.get(`/messes/${messId}/members`);
    return response.data.data;
  },

  async updateMemberStatus(
    messId: number,
    memberId: number,
    status: 'ACTIVE' | 'REJECTED' | 'INACTIVE'
  ): Promise<{ memberId: number; newStatus: string; message: string }> {
    const response = await api.patch(`/messes/${messId}/members/${memberId}/status`, { status });
    return response.data.data;
  },

  async updateSettings(
    messId: number,
    settings: { name?: string; address?: string; lunchCutoffTime?: string; dinnerCutoffTime?: string }
  ): Promise<Mess> {
    const response = await api.patch(`/messes/${messId}/settings`, settings);
    return response.data.data;
  },
};
