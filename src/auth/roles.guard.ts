import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const rolesRequeridos = this.reflector.getAllAndOverride<string[]>('roles', [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!rolesRequeridos) return true;

        const { user } = context.switchToHttp().getRequest();
        if (!rolesRequeridos.includes(user.role)) {
            throw new ForbiddenException('No tienes permiso para esta acción');
        }
        return true;
    }
}