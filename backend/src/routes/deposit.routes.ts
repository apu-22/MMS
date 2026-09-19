import { Router } from 'express';
import { DepositController } from '../controllers/deposit.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireActiveMember, requireManager } from '../middlewares/role.middleware';

const router = Router();

// Submit a deposit (Manager auto-approved, Member pending)
router.post('/', authenticate, requireActiveMember, DepositController.create);

// List deposits with filters
router.get('/', authenticate, requireActiveMember, DepositController.list);

// Approve or reject a deposit (Manager only)
router.patch('/:id/status', authenticate, requireActiveMember, requireManager, DepositController.updateStatus);

// Delete a deposit
router.delete('/:id', authenticate, requireActiveMember, DepositController.remove);

export default router;
