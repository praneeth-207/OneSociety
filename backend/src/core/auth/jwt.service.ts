import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { UserRole } from '../rbac/roles.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  societyId: string;
  flatId?: string;
  flatNumber?: string;
  mustChangePassword: boolean;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
}
