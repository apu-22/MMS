import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';
import { env } from '../config/env';
import { AppError, JWTPayload, UserDTO, MessMembershipDTO } from '../types';

export class AuthService {
  /**
   * Register a new user with email and hashed password
   */
  static async register(name: string, email: string, password: string, phone?: string) {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    // 1. Validation
    if (!trimmedName || !trimmedEmail || !password) {
      throw new AppError('Name, email, and password are required', 400, 'VALIDATION_ERROR');
    }

    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters long', 400, 'VALIDATION_ERROR');
    }

    // 2. Check if user already exists
    const existingUsers = await query<any[]>(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [trimmedEmail]
    );

    if (existingUsers.length > 0) {
      throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
    }

    // 3. Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 4. Insert user
    const result = await query<any>(
      'INSERT INTO users (name, email, password_hash, phone) VALUES (?, ?, ?, ?)',
      [trimmedName, trimmedEmail, passwordHash, phone?.trim() || null]
    );

    const userId = result.insertId;

    // 5. Generate JWT token
    const token = this.generateToken({ userId, email: trimmedEmail });

    const user: UserDTO = {
      id: userId,
      name: trimmedName,
      email: trimmedEmail,
      phone: phone?.trim() || null,
      createdAt: new Date().toISOString(),
    };

    return { user, token };
  }

  /**
   * Authenticate user with email and password
   */
  static async login(email: string, password: string) {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
    }

    // 1. Fetch user by email
    const users = await query<any[]>(
      'SELECT id, name, email, password_hash, phone, created_at FROM users WHERE email = ? LIMIT 1',
      [trimmedEmail]
    );

    if (users.length === 0) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const dbUser = users[0];

    // 2. Verify password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, dbUser.password_hash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // 3. Fetch active or pending mess membership
    const memberships = await query<any[]>(
      `SELECT mm.mess_id, mm.role, mm.status, m.name as mess_name 
       FROM mess_members mm
       JOIN messes m ON m.id = mm.mess_id
       WHERE mm.user_id = ? AND mm.status IN ('ACTIVE', 'PENDING')
       LIMIT 1`,
      [dbUser.id]
    );

    let activeMembership: MessMembershipDTO | null = null;
    if (memberships.length > 0) {
      const m = memberships[0];
      activeMembership = {
        messId: m.mess_id,
        messName: m.mess_name,
        role: m.role,
        status: m.status,
      };
    }

    // 4. Generate JWT
    const token = this.generateToken({ userId: dbUser.id, email: dbUser.email });

    const user: UserDTO = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      phone: dbUser.phone,
      createdAt: dbUser.created_at,
    };

    return { user, token, activeMembership };
  }

  /**
   * Retrieve current user profile and memberships
   */
  static async getProfile(userId: number) {
    const users = await query<any[]>(
      'SELECT id, name, email, phone, created_at FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (users.length === 0) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const dbUser = users[0];

    // Fetch all mess memberships for this user
    const memberships = await query<any[]>(
      `SELECT mm.mess_id, mm.role, mm.status, m.name as mess_name, m.invite_code
       FROM mess_members mm
       JOIN messes m ON m.id = mm.mess_id
       WHERE mm.user_id = ?`,
      [userId]
    );

    return {
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone,
        createdAt: dbUser.created_at,
      },
      memberships: memberships.map((m) => ({
        messId: m.mess_id,
        messName: m.mess_name,
        inviteCode: m.invite_code,
        role: m.role,
        status: m.status,
      })),
    };
  }

  /**
   * Helper to sign JWT payload
   */
  private static generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });
  }
}
