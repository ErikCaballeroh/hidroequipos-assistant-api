import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

vi.mock('bcrypt', () => ({
  compare: vi.fn(),
  hash: vi.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> } };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: JwtService,
          useValue: { sign: vi.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('obtenerPerfil', () => {
    it('returns the user profile when it exists', async () => {
      const perfil = { id: 1, name: 'Ana', email: 'ana@hidroequipos.com', role: 'employee' };
      prisma.user.findUnique.mockResolvedValue(perfil);

      const resultado = await service.obtenerPerfil(1);

      expect(resultado).toEqual(perfil);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { id: true, name: true, email: true, role: true },
      });
    });

    it('throws when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.obtenerPerfil(99)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('cambiarPassword', () => {
    it('rejects when the current password is incorrect', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, passwordHash: 'hash-actual' });
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(service.cambiarPassword(1, 'incorrecta', 'nuevaPassword123')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('saves the new password hash when the current password is correct', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, passwordHash: 'hash-actual' });
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(bcrypt.hash).mockResolvedValue('hash-nuevo' as never);

      await service.cambiarPassword(1, 'correcta', 'nuevaPassword123');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { passwordHash: 'hash-nuevo', mustChangePassword: false },
      });
    });
  });
});
