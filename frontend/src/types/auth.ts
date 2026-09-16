export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
}

export interface MessMembership {
  messId: number;
  messName: string;
  inviteCode?: string;
  role: 'MANAGER' | 'MEMBER';
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE';
}

export interface AuthResponse {
  user: User;
  token: string;
  activeMembership?: MessMembership | null;
}

export interface ProfileResponse {
  user: User;
  memberships: MessMembership[];
}
