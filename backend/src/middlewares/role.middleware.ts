import { Response, NextFunction } from 'express';
import { query } from '../config/db';
import { AuthRequest, AppError } from '../types';

/**
 * Middleware that verifies the authenticated user has ACTIVE membership in the requested mess.
 * Attaches req.membership = { messId, role, status }
 */
export async function requireActiveMember(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    // Extract messId from route params, query, body, or custom header
    const rawMessId = req.params.messId || req.query.messId || req.body?.messId || req.headers['x-mess-id'];
    let messId = Number(rawMessId);
    let member: any = null;

    if (!messId || isNaN(messId)) {
      // Auto-resolve: if no messId specified, use the user's active mess membership
      const activeRows = await query<any[]>(
        'SELECT mess_id, role, status FROM mess_members WHERE user_id = ? AND status = "ACTIVE" ORDER BY (role = "MANAGER") DESC, joined_at DESC LIMIT 1',
        [userId]
      );

      if (activeRows.length === 0) {
        throw new AppError('Valid Mess ID is required or no active mess membership found', 400, 'MESS_ID_REQUIRED');
      }

      messId = Number(activeRows[0].mess_id);
      member = activeRows[0];
    } else {
      const rows = await query<any[]>(
        'SELECT id, role, status FROM mess_members WHERE mess_id = ? AND user_id = ? LIMIT 1',
        [messId, userId]
      );

      if (rows.length === 0) {
        throw new AppError('You are not a member of this mess', 403, 'NOT_A_MEMBER');
      }

      member = rows[0];

      if (member.status === 'PENDING') {
        throw new AppError('Your join request for this mess is pending manager approval', 403, 'MEMBERSHIP_PENDING');
      }

      if (member.status !== 'ACTIVE') {
        throw new AppError('Your membership in this mess is inactive', 403, 'MEMBERSHIP_INACTIVE');
      }
    }

    // Attach membership context
    req.membership = {
      messId,
      role: member.role,
      status: member.status,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware that requires the caller to have the MANAGER role in the mess.
 * Must be preceded by requireActiveMember.
 */
export function requireManager(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.membership) {
    return next(new AppError('Membership verification required', 500, 'MEMBERSHIP_NOT_VERIFIED'));
  }

  if (req.membership.role !== 'MANAGER') {
    return next(new AppError('Forbidden: Manager permissions required', 403, 'MANAGER_ROLE_REQUIRED'));
  }

  next();
}
