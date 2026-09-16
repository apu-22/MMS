export interface Mess {
  id: number;
  name: string;
  inviteCode: string;
  address: string | null;
  lunchCutoffTime: string;
  dinnerCutoffTime: string;
  createdByUserId: number;
  createdAt: string;
}

export interface Member {
  memberId: number;
  userId: number;
  name: string;
  email: string;
  phone: string | null;
  role: 'MANAGER' | 'MEMBER';
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE';
  joinedAt: string;
}

export interface CreateMessInput {
  name: string;
  address?: string;
  lunchCutoffTime?: string;
  dinnerCutoffTime?: string;
}

export interface JoinMessResult {
  messId: number;
  messName: string;
  role: 'MEMBER';
  status: 'PENDING';
  message: string;
}
