import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireActiveMember } from '../middlewares/role.middleware';

const router = Router();

// Overall Mess Financial KPIs & Live Meal Rate
router.get('/summary', authenticate, requireActiveMember, DashboardController.getSummary);

// Excel-style master ledger with all active members
router.get('/member-ledger', authenticate, requireActiveMember, DashboardController.getMemberLedger);

// Logged-in member's personal financial overview
router.get('/my-summary', authenticate, requireActiveMember, DashboardController.getMySummary);

export default router;
