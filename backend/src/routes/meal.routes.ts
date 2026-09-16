import { Router } from 'express';
import { MealController } from '../controllers/meal.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireActiveMember, requireManager } from '../middlewares/role.middleware';

const router = Router();

// Member updates personal meal counts (Subject to server cutoff time)
router.put('/self', authenticate, requireActiveMember, MealController.updateSelfMeal);

// Manager updates any member's count on any date (Bypasses cutoff)
router.put(
  '/manager-override',
  authenticate,
  requireActiveMember,
  requireManager,
  MealController.managerOverride
);

// Get daily master sheet for a date
router.get('/daily-sheet', authenticate, requireActiveMember, MealController.getDailySheet);

// Get personal monthly meal breakdown
router.get('/my-monthly', authenticate, requireActiveMember, MealController.getMyMonthly);

export default router;
