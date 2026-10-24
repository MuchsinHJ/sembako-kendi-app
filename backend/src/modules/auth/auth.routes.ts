/**
 * modules/auth/auth.routes.ts
 * Routes untuk authentication endpoints.
 *
 * Sesuai SDD §5.1, seluruh endpoint memerlukan access token kecuali
 * `/auth/login` dan `/auth/refresh-token` — termasuk `/auth/logout`.
 */

import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { loginLimiter } from '../../middlewares/rateLimiter.middleware.js';
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
  authenticate,
  validate(authSchema.logoutSchema),
  authController.logout,
);

export default router;
