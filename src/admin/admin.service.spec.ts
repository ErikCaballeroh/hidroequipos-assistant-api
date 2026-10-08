import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: {
    $queryRaw: ReturnType<typeof vi.fn>;
    feedback: { count: ReturnType<typeof vi.fn> };
    message: { count: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn> };
    geminiLog: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  };

  beforeEach(async () => {
    prisma = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      feedback: { count: vi.fn().mockResolvedValue(0) },
      message: { count: vi.fn().mockResolvedValue(0), findUnique: vi.fn(), findFirst: vi.fn() },
      geminiLog: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStats', () => {
    it('returns approvalRate null when there is no feedback', async () => {
      prisma.feedback.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const resultado = await service.getStats({});

      expect(resultado.feedback).toEqual({ likes: 0, dislikes: 0, total: 0, approvalRate: null });
    });

    it('computes a rounded approvalRate from likes and dislikes', async () => {
      prisma.feedback.count.mockResolvedValueOnce(85).mockResolvedValueOnce(15);

      const resultado = await service.getStats({});

      expect(resultado.feedback).toEqual({ likes: 85, dislikes: 15, total: 100, approvalRate: 0.85 });
    });

    it('defaults the range to the last 30 days when from/to are not given', async () => {
      await service.getStats({});

      // topProducts query is the first $queryRaw call; validates it received two date boundaries
      const topProductsCall = prisma.$queryRaw.mock.calls[0];
      const valoresFecha = topProductsCall.filter((v: unknown) => v instanceof Date);
      expect(valoresFecha).toHaveLength(2);
      const [desde, hasta] = valoresFecha as Date[];
      const diffDias = (hasta.getTime() - desde.getTime()) / (24 * 60 * 60 * 1000);
      expect(Math.round(diffDias)).toBe(30);
    });
  });

  describe('getGeminiLogs', () => {
    it('filters by success and applies pagination', async () => {
      await service.getGeminiLogs({ page: 2, pageSize: 10, success: false });

      expect(prisma.geminiLog.findMany).toHaveBeenCalledWith({
        where: { success: false },
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
      });
      expect(prisma.geminiLog.count).toHaveBeenCalledWith({ where: { success: false } });
    });

    it('does not filter by success when it is not provided', async () => {
      await service.getGeminiLogs({ page: 1, pageSize: 20 });

      expect(prisma.geminiLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('getMessages', () => {
    it('applies the noMatch filter in the count query', async () => {
      await service.getMessages({ page: 1, pageSize: 20, noMatch: true });

      expect(prisma.message.count).toHaveBeenCalledWith({
        where: {
          role: 'assistant',
          OR: [{ bestMatchDistance: null }, { bestMatchDistance: { gt: expect.any(Number) } }],
        },
      });
    });

    it('applies the feedback filter in the count query', async () => {
      await service.getMessages({ page: 1, pageSize: 20, feedback: 'dislike' });

      expect(prisma.message.count).toHaveBeenCalledWith({
        where: { role: 'assistant', feedback: { type: 'dislike' } },
      });
    });
  });

  describe('getMessageTrace', () => {
    it('throws NotFoundException when the message does not exist', async () => {
      prisma.message.findUnique.mockResolvedValue(null);

      await expect(service.getMessageTrace(999)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the message is not from the assistant', async () => {
      prisma.message.findUnique.mockResolvedValue({ id: 1, role: 'user' });

      await expect(service.getMessageTrace(1)).rejects.toThrow(NotFoundException);
    });

    it('maps distance to rounded similarity for products and knowledge', async () => {
      prisma.message.findUnique.mockResolvedValue({
        id: 91,
        role: 'assistant',
        content: 'diagnóstico',
        createdAt: new Date('2026-01-01'),
        responseTimeMs: 3200,
        bestMatchDistance: 0.18,
        conversationId: 1,
        feedback: { type: 'dislike', comment: null },
      });
      prisma.message.findFirst.mockResolvedValue({ content: 'el agua está verde' });
      prisma.$queryRaw
        .mockResolvedValueOnce([{ id: 3, sku: 'QUI-002', name: 'Cloro', distance: 0.21 }])
        .mockResolvedValueOnce([{ id: 2, title: 'Algas', distance: 0.25 }]);

      const resultado = await service.getMessageTrace(91);

      expect(resultado.question).toBe('el agua está verde');
      expect(resultado.feedback).toEqual({ type: 'dislike', comment: null });
      expect(resultado.products).toEqual([
        { id: 3, sku: 'QUI-002', name: 'Cloro', distance: 0.21, similarity: 0.79 },
      ]);
      expect(resultado.knowledge).toEqual([{ id: 2, title: 'Algas', distance: 0.25, similarity: 0.75 }]);
    });
  });
});
