import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { login: ReturnType<typeof vi.fn>; obtenerPerfil: ReturnType<typeof vi.fn>; cambiarPassword: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    authService = {
      login: vi.fn(),
      obtenerPerfil: vi.fn(),
      cambiarPassword: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('me() delegates to authService.obtenerPerfil with the authenticated user id', async () => {
    const perfil = { id: 1, name: 'Ana', email: 'ana@hidroequipos.com', role: 'employee' };
    authService.obtenerPerfil.mockResolvedValue(perfil);

    const resultado = await controller.me({ user: { userId: 1, role: 'employee' } });

    expect(authService.obtenerPerfil).toHaveBeenCalledWith(1);
    expect(resultado).toEqual(perfil);
  });

  it('changePassword() delegates to authService.cambiarPassword', async () => {
    await controller.changePassword(
      { user: { userId: 1, role: 'employee' } },
      { currentPassword: 'actual', newPassword: 'nuevaPassword123' },
    );

    expect(authService.cambiarPassword).toHaveBeenCalledWith(1, 'actual', 'nuevaPassword123');
  });
});