import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RolesGuard } from './roles.guard.js';

function crearContexto(role: string): ExecutionContext {
    const handler = function handler() { };
    const controllerClass = class Controller { };
    return {
        getHandler: () => handler,
        getClass: () => controllerClass,
        switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
    let reflector: Reflector;
    let guard: RolesGuard;

    beforeEach(() => {
        reflector = new Reflector();
        guard = new RolesGuard(reflector);
    });

    it('allows access when no roles metadata is set', () => {
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

        expect(guard.canActivate(crearContexto('employee'))).toBe(true);
    });

    it('enforces a role restricted at the controller (class) level, not just the handler', () => {
        // Simulates @Roles('supervisor') applied to the whole controller class,
        // which Reflector only sees via context.getClass(), not getHandler().
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['supervisor']);

        expect(() => guard.canActivate(crearContexto('employee'))).toThrow(ForbiddenException);
    });

    it('allows a supervisor through a role-restricted route', () => {
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['supervisor']);

        expect(guard.canActivate(crearContexto('supervisor'))).toBe(true);
    });

    it('checks both getHandler() and getClass() so method-level @Roles still works', () => {
        const spy = vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['supervisor']);
        const context = crearContexto('employee');

        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        expect(spy).toHaveBeenCalledWith('roles', [context.getHandler(), context.getClass()]);
    });
});
