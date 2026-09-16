import { Request } from 'express';

export interface JWTPayload {
  userId: number;
  email: string;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export interface UserDTO {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
}

export interface MessMembershipDTO {
  messId: number;
  messName: string;
  role: 'MANAGER' | 'MEMBER';
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE';
}

export class AppError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
