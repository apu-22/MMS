import { Router } from 'express';
import { MessController } from '../controllers/mess.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireActiveMember, requireManager } from '../middlewares/role.middleware';

const router = Router();

// Create new mess
router.post('/', authenticate, MessController.create);

// Join existing mess via invite code
router.post('/join', authenticate, MessController.join);

// Get mess details
router.get('/:messId', authenticate, requireActiveMember, MessController.getDetails);

// List members of a mess
router.get('/:messId/members', authenticate, requireActiveMember, MessController.getMembers);

// Update member status (Manager only: Approve / Reject)
router.patch(
  '/:messId/members/:memberId/status',
  authenticate,
  requireActiveMember,
  requireManager,
  MessController.updateMemberStatus
);

// Update mess settings (Manager only)
router.patch(
  '/:messId/settings',
  authenticate,
  requireActiveMember,
  requireManager,
  MessController.updateSettings
);

export default router;
