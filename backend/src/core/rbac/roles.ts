export const Roles = {
  PRESIDENT: 'President',
  RESIDENT: 'Resident',
  SERVICE_PROVIDER: 'Service Provider',
  SUPPLIER: 'Supplier',
  SECURITY_PERSONNEL: 'Security Personnel',
  DELIVERY_PARTNER: 'Delivery Partner',
  PLATFORM_ADMIN: 'Platform Admin',
} as const;

export type UserRole = (typeof Roles)[keyof typeof Roles];

export const ALL_ROLES: UserRole[] = Object.values(Roles);
