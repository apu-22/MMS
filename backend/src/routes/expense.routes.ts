import { Router } from 'express';
import { ExpenseController } from '../controllers/expense.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireActiveMember, requireManager } from '../middlewares/role.middleware';

const router = Router();

// Log a new expense (Manager auto-approved, Member pending)
router.post('/', authenticate, requireActiveMember, ExpenseController.create);

// List expenses with filters
router.get('/', authenticate, requireActiveMember, ExpenseController.list);

// Approve or reject an expense (Manager only)
router.patch('/:id/status', authenticate, requireActiveMember, requireManager, ExpenseController.updateStatus);

// Delete an expense
router.delete('/:id', authenticate, requireActiveMember, ExpenseController.remove);

export default router;
