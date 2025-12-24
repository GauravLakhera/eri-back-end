import { SetMetadata } from '@nestjs/common';

export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  CLIENT_ADMIN = 'CLIENT_ADMIN',
  PREPARER = 'PREPARER',
  REVIEWER = 'REVIEWER',
  CLIENT_USER = 'CLIENT_USER',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);