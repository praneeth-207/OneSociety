import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/user.model.js';
import { Society } from '../models/society.model.js';
import { Flat } from '../models/flat.model.js';
import { Roles } from '../rbac/roles.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from './jwt.service.js';
import { auditService } from '../audit/audit.service.js';

export const loginSchema = z.object({
  phone: z.string().optional(),
  email: z.string().optional(),
  identifier: z.string().optional(),
  password: z.string().min(6),
  societyCode: z.string().optional(),
}).refine(data => data.phone || data.email || data.identifier, {
  message: 'Phone number or email address is required',
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  role: z.enum([
    Roles.RESIDENT,
    Roles.SERVICE_PROVIDER,
    Roles.SUPPLIER,
    Roles.SECURITY_PERSONNEL,
    Roles.DELIVERY_PARTNER,
  ]),
  flatNumber: z.string().optional(),
  temporaryPassword: z.string().min(6),
});

export class AuthController {
  public async login(req: Request, res: Response): Promise<void> {
    try {
      const data = loginSchema.parse(req.body);
      const rawInput = (data.phone || data.identifier || data.email || '').trim();
      const isEmail = rawInput.includes('@');
      const cleanPhone = rawInput.replace(/[\s\-\+]/g, '').slice(-10);

      const user = await User.findOne(
        isEmail
          ? { email: rawInput.toLowerCase() }
          : { $or: [{ phone: rawInput }, { phone: cleanPhone }] }
      ).populate('societyId');

      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid phone number / email or password' });
        return;
      }

      if (user.status === 'SUSPENDED') {
        res.status(403).json({ success: false, message: 'Account is suspended. Please contact society management.' });
        return;
      }

      const isMatch = await bcrypt.compare(data.password, user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Invalid email or password' });
        return;
      }

      const tokenPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        societyId: user.societyId._id.toString(),
        flatId: user.flatId?.toString(),
        flatNumber: user.flatNumber,
        mustChangePassword: user.mustChangePassword,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      res.status(200).json({
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          societyId: user.societyId._id,
          society: user.societyId,
          flatId: user.flatId,
          flatNumber: user.flatNumber,
          mustChangePassword: user.mustChangePassword,
        },
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ success: false, message: 'Refresh token required' });
        return;
      }

      const payload = verifyRefreshToken(refreshToken);
      const user = await User.findById(payload.userId);
      if (!user || user.status === 'SUSPENDED') {
        res.status(401).json({ success: false, message: 'Invalid refresh token' });
        return;
      }

      const tokenPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        societyId: user.societyId.toString(),
        flatId: user.flatId?.toString(),
        flatNumber: user.flatNumber,
        mustChangePassword: user.mustChangePassword,
      };

      const newAccessToken = generateAccessToken(tokenPayload);
      res.status(200).json({ success: true, accessToken: newAccessToken });
    } catch (err: any) {
      res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }
  }

  public async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const data = changePasswordSchema.parse(req.body);
      const user = await User.findById(req.user.userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      const isMatch = await bcrypt.compare(data.currentPassword, user.passwordHash);
      if (!isMatch) {
        res.status(400).json({ success: false, message: 'Current password does not match' });
        return;
      }

      user.passwordHash = await bcrypt.hash(data.newPassword, 10);
      user.mustChangePassword = false;
      user.temporaryPasswordPlain = undefined;
      await user.save();

      await auditService.log({
        societyId: user.societyId,
        actorId: user._id,
        actorName: user.name,
        actorRole: user.role,
        action: 'PASSWORD_CHANGED',
        entityType: 'User',
        entityId: user._id.toString(),
      });

      const tokenPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        societyId: user.societyId.toString(),
        flatId: user.flatId?.toString(),
        flatNumber: user.flatNumber,
        mustChangePassword: false,
      };

      const newAccessToken = generateAccessToken(tokenPayload);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
        accessToken: newAccessToken,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public async getMe(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const user = await User.findById(req.user.userId).populate('societyId').select('-passwordHash');
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      res.status(200).json({ success: true, user });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public async createUserByPresident(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const data = createUserSchema.parse(req.body);
      const email = data.email.toLowerCase().trim();

      const existing = await User.findOne({ societyId: req.user.societyId, email });
      if (existing) {
        res.status(400).json({ success: false, message: 'User with this email already exists in society' });
        return;
      }

      const passwordHash = await bcrypt.hash(data.temporaryPassword, 10);
      let flatId = undefined;

      if (data.flatNumber) {
        const flat = await Flat.findOne({ societyId: req.user.societyId, flatNumber: data.flatNumber });
        if (flat) {
          flatId = flat._id;
        }
      }

      const user = new User({
        name: data.name,
        email,
        phone: data.phone,
        passwordHash,
        role: data.role,
        societyId: req.user.societyId,
        flatId,
        flatNumber: data.flatNumber,
        mustChangePassword: true, // Required on first login for accounts created by President
        temporaryPasswordPlain: data.temporaryPassword,
        status: 'ACTIVE',
      });

      await user.save();

      await auditService.log({
        societyId: req.user.societyId,
        actorId: req.user.userId as any,
        actorName: 'President',
        actorRole: Roles.PRESIDENT,
        action: 'USER_CREATED_BY_PRESIDENT',
        entityType: 'User',
        entityId: user._id.toString(),
        newValue: { name: user.name, role: user.role, email: user.email },
      });

      res.status(201).json({
        success: true,
        message: 'Account created with temporary password. User will be forced to change password on first login.',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          temporaryPassword: data.temporaryPassword,
        },
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

export const authController = new AuthController();
