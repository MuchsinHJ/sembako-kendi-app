/**
 * modules/auth/auth.routes.ts
 * Routes untuk authentication endpoints.
 */

import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { loginLimiter } from '../../middlewares/rateLimiter.js';
import * as authController from './auth.controller.js';
import * as authSchema from './auth.schema.js';

const router = Router();

// POST /auth/login - Login dengan rate limit ketat
router.post(
  '/login',
  loginLimiter,
  validate(authSchema.loginSchema),
  authController.login,
);

// POST /auth/refresh-token - Refresh access token
router.post(
  '/refresh-token',
  validate(authSchema.refreshTokenSchema),
  authController.refreshToken,
);

// POST /auth/logout - Logout (revoke token/session)
router.post(
  '/logout',
  validate(authSchema.logoutSchema),
  authController.logout,
);

export default router;
