import { Response, NextFunction } from 'express';
import { MessService } from '../services/mess.service';
import { AuthRequest } from '../types';

export class MessController {
  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, address, lunchCutoffTime, dinnerCutoffTime } = req.body;
      const userId = req.user!.userId;

      const mess = await MessService.createMess(
        name,
        address,
        lunchCutoffTime,
        dinnerCutoffTime,
        userId
      );

      res.status(201).json({
        success: true,
        data: mess,
        message: 'Mess created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async join(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { inviteCode } = req.body;
      const userId = req.user!.userId;

      const result = await MessService.joinMess(inviteCode, userId);

      res.status(200).json({
        success: true,
        data: result,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDetails(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const messId = Number(req.params.messId);
      const mess = await MessService.getMessDetails(messId);

      res.status(200).json({
        success: true,
        data: mess,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMembers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const messId = Number(req.params.messId);
      const members = await MessService.getMembers(messId);

      res.status(200).json({
        success: true,
        data: members,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateMemberStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const messId = Number(req.params.messId);
      const memberId = Number(req.params.memberId);
      const { status } = req.body;
      const managerUserId = req.user!.userId;

      const result = await MessService.updateMemberStatus(
        messId,
        memberId,
        status,
        managerUserId
      );

      res.status(200).json({
        success: true,
        data: result,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateSettings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const messId = Number(req.params.messId);
      const settings = req.body;

      const updated = await MessService.updateSettings(messId, settings);

      res.status(200).json({
        success: true,
        data: updated,
        message: 'Mess settings updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
