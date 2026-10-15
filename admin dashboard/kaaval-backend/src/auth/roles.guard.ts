import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles decorator → allow (auth is still checked by JwtAuthGuard)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) return false;
    const normalizedUserRole = user.role.toUpperCase();
    const normalizedRequiredRoles = requiredRoles.map(r => r.toUpperCase());
    
    if (normalizedRequiredRoles.includes(normalizedUserRole)) {
      return true;
    }

    // Dynamic Subdivision Admin match:
    // If the endpoint allows ANY subdivision admin (*_ADMIN), grant access to any subdivision admin
    const hasSubdivisionAdminReq = normalizedRequiredRoles.some(
      r => r.endsWith('_ADMIN') && r !== 'SUPER_ADMIN'
    );
    if (hasSubdivisionAdminReq && normalizedUserRole.endsWith('_ADMIN') && normalizedUserRole !== 'SUPER_ADMIN') {
      return true;
    }

    return false;
  }
}
