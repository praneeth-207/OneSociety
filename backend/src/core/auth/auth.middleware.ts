import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from './jwt.service.js';
import { UserRole } from '../rbac/roles.js';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;

    // Check if user is forced to change password
    if (payload.mustChangePassword && !req.originalUrl.includes('/change-password')) {
      res.status(403).json({
        success: false,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'You must change your temporary password before accessing any society features.',
      });
      return;
    }

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export const verifyAuth = authenticate;

export function requireRole(...allowedRoles: (UserRole | UserRole[])[]) {
  const flattened = allowedRoles.flat();
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!flattened.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Access denied for your role in this society. Requires one of: [${flattened.join(', ')}].`,
      });
      return;
    }

    next();
  };
}

export function enforceSocietyIsolation(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  // If request contains societyId in body/query/params, verify it matches token
  const requestedSocietyId = req.params.societyId || req.query.societyId || req.body.societyId;
  if (requestedSocietyId && requestedSocietyId.toString() !== req.user.societyId) {
    res.status(403).json({
      success: false,
      message: 'Forbidden: Access to data outside your registered society is denied.',
    });
    return;
  }

  next();
}
