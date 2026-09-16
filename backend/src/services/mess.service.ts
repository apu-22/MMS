import crypto from 'crypto';
import { query, withTransaction } from '../config/db';
import { AppError, MessDTO, MemberDTO } from '../types';

export class MessService {
  /**
   * Helper to generate a unique 6-character alphanumeric invite code
   */
  private static async generateUniqueInviteCode(): Promise<string> {
    for (let attempts = 0; attempts < 10; attempts++) {
      const code = 'M-' + crypto.randomBytes(3).toString('hex').toUpperCase(); // e.g. M-8A2F9C
      const existing = await query<any[]>('SELECT id FROM messes WHERE invite_code = ? LIMIT 1', [code]);
      if (existing.length === 0) {
        return code;
      }
    }
    throw new AppError('Failed to generate unique invite code. Please try again.', 500);
  }

  /**
   * Create a new mess. The creator automatically becomes MANAGER with ACTIVE status.
   * Also initializes the current calendar month in billing_months.
   */
  static async createMess(
    name: string,
    address: string | null,
    lunchCutoffTime: string | null,
    dinnerCutoffTime: string | null,
    creatorUserId: number
  ): Promise<MessDTO> {
    const trimmedName = name?.trim();
    if (!trimmedName) {
      throw new AppError('Mess name is required', 400, 'VALIDATION_ERROR');
    }

    const inviteCode = await this.generateUniqueInviteCode();
    const lunchCutoff = lunchCutoffTime || '09:00:00';
    const dinnerCutoff = dinnerCutoffTime || '16:00:00';

    return await withTransaction(async (conn) => {
      // 1. Insert into messes table
      const [messResult] = await conn.execute<any>(
        `INSERT INTO messes (name, invite_code, address, lunch_cutoff_time, dinner_cutoff_time, created_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [trimmedName, inviteCode, address || null, lunchCutoff, dinnerCutoff, creatorUserId]
      );

      const messId = messResult.insertId;

      // 2. Insert creator into mess_members as MANAGER and ACTIVE
      await conn.execute(
        `INSERT INTO mess_members (mess_id, user_id, role, status)
         VALUES (?, ?, 'MANAGER', 'ACTIVE')`,
        [messId, creatorUserId]
      );

      // 3. Initialize current calendar month in billing_months
      const now = new Date();
      const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // e.g. '2026-09'

      await conn.execute(
        `INSERT INTO billing_months (mess_id, month_year, status)
         VALUES (?, ?, 'OPEN')
         ON DUPLICATE KEY UPDATE status = status`,
        [messId, currentMonthYear]
      );

      return {
        id: messId,
        name: trimmedName,
        inviteCode,
        address: address || null,
        lunchCutoffTime: lunchCutoff,
        dinnerCutoffTime: dinnerCutoff,
        createdByUserId: creatorUserId,
        createdAt: new Date().toISOString(),
      };
    });
  }

  /**
   * Join an existing mess via its invite code.
   * Membership is placed in PENDING status until approved by the Manager.
   */
  static async joinMess(inviteCode: string, userId: number) {
    const trimmedCode = inviteCode?.trim().toUpperCase();
    if (!trimmedCode) {
      throw new AppError('Invite code is required', 400, 'VALIDATION_ERROR');
    }

    // 1. Find mess by invite code
    const messes = await query<any[]>(
      'SELECT id, name FROM messes WHERE invite_code = ? LIMIT 1',
      [trimmedCode]
    );

    if (messes.length === 0) {
      throw new AppError('Invalid invite code. No mess found.', 404, 'MESS_NOT_FOUND');
    }

    const mess = messes[0];

    // 2. Check existing membership
    const existing = await query<any[]>(
      'SELECT id, status, role FROM mess_members WHERE mess_id = ? AND user_id = ? LIMIT 1',
      [mess.id, userId]
    );

    if (existing.length > 0) {
      const membership = existing[0];
      if (membership.status === 'ACTIVE') {
        throw new AppError('You are already an active member of this mess', 400, 'ALREADY_ACTIVE_MEMBER');
      }
      if (membership.status === 'PENDING') {
        throw new AppError('You already have a pending join request for this mess', 400, 'REQUEST_ALREADY_PENDING');
      }

      // If previously INACTIVE or REJECTED, reset to PENDING
      await query(
        `UPDATE mess_members SET status = 'PENDING', joined_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [membership.id]
      );

      return {
        messId: mess.id,
        messName: mess.name,
        role: membership.role,
        status: 'PENDING',
        message: 'Your join request has been re-submitted for manager approval',
      };
    }

    // 3. Insert new pending membership
    await query(
      `INSERT INTO mess_members (mess_id, user_id, role, status)
       VALUES (?, ?, 'MEMBER', 'PENDING')`,
      [mess.id, userId]
    );

    return {
      messId: mess.id,
      messName: mess.name,
      role: 'MEMBER',
      status: 'PENDING',
      message: 'Join request submitted! Waiting for mess manager approval.',
    };
  }

  /**
   * Get mess details by ID
   */
  static async getMessDetails(messId: number): Promise<MessDTO> {
    const messes = await query<any[]>(
      `SELECT id, name, invite_code, address, lunch_cutoff_time, dinner_cutoff_time, created_by_user_id, created_at
       FROM messes WHERE id = ? LIMIT 1`,
      [messId]
    );

    if (messes.length === 0) {
      throw new AppError('Mess not found', 404, 'MESS_NOT_FOUND');
    }

    const m = messes[0];
    return {
      id: m.id,
      name: m.name,
      inviteCode: m.invite_code,
      address: m.address,
      lunchCutoffTime: m.lunch_cutoff_time,
      dinnerCutoffTime: m.dinner_cutoff_time,
      createdByUserId: m.created_by_user_id,
      createdAt: m.created_at,
    };
  }

  /**
   * Get all members of a mess
   */
  static async getMembers(messId: number): Promise<MemberDTO[]> {
    const rows = await query<any[]>(
      `SELECT 
         mm.id as member_id,
         mm.user_id,
         u.name,
         u.email,
         u.phone,
         mm.role,
         mm.status,
         mm.joined_at
       FROM mess_members mm
       JOIN users u ON u.id = mm.user_id
       WHERE mm.mess_id = ?
       ORDER BY 
         CASE WHEN mm.role = 'MANAGER' THEN 0 ELSE 1 END,
         CASE WHEN mm.status = 'PENDING' THEN 0 WHEN mm.status = 'ACTIVE' THEN 1 ELSE 2 END,
         u.name ASC`,
      [messId]
    );

    return rows.map((r) => ({
      memberId: r.member_id,
      userId: r.user_id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      role: r.role,
      status: r.status,
      joinedAt: r.joined_at,
    }));
  }

  /**
   * Update member status (Manager only: e.g. Approve PENDING -> ACTIVE, or REJECTED)
   */
  static async updateMemberStatus(
    messId: number,
    memberId: number,
    newStatus: 'ACTIVE' | 'REJECTED' | 'INACTIVE',
    managerUserId: number
  ) {
    // 1. Verify target member exists in this mess
    const members = await query<any[]>(
      'SELECT id, user_id, role, status FROM mess_members WHERE id = ? AND mess_id = ? LIMIT 1',
      [memberId, messId]
    );

    if (members.length === 0) {
      throw new AppError('Member record not found in this mess', 404, 'MEMBER_NOT_FOUND');
    }

    const member = members[0];

    // 2. Prevent manager from altering their own status to inactive/rejected
    if (member.user_id === managerUserId && newStatus !== 'ACTIVE') {
      throw new AppError('Managers cannot deactivate or reject themselves', 400, 'CANNOT_MODIFY_SELF');
    }

    // 3. Update status
    await query(
      'UPDATE mess_members SET status = ? WHERE id = ? AND mess_id = ?',
      [newStatus, memberId, messId]
    );

    return {
      memberId,
      newStatus,
      message: `Member status updated to ${newStatus}`,
    };
  }

  /**
   * Update mess settings (Manager only)
   */
  static async updateSettings(
    messId: number,
    settings: {
      name?: string;
      address?: string | null;
      lunchCutoffTime?: string;
      dinnerCutoffTime?: string;
    }
  ) {
    const fields: string[] = [];
    const values: any[] = [];

    if (settings.name?.trim()) {
      fields.push('name = ?');
      values.push(settings.name.trim());
    }
    if (settings.address !== undefined) {
      fields.push('address = ?');
      values.push(settings.address?.trim() || null);
    }
    if (settings.lunchCutoffTime) {
      fields.push('lunch_cutoff_time = ?');
      values.push(settings.lunchCutoffTime);
    }
    if (settings.dinnerCutoffTime) {
      fields.push('dinner_cutoff_time = ?');
      values.push(settings.dinnerCutoffTime);
    }

    if (fields.length === 0) {
      throw new AppError('No settings fields to update', 400, 'NO_FIELDS_PROVIDED');
    }

    values.push(messId);
    await query(
      `UPDATE messes SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return await this.getMessDetails(messId);
  }
}
