import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { FeedbackService } from './feedback.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let prisma: {
    message: { findUnique: ReturnType<typeof vi.fn> };
    feedback: { upsert: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  };

  beforeEach(async () => {
    prisma = {
      message: { findUnique: vi.fn() },
      feedback: { upsert: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [FeedbackService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upsert', () => {
    it('throws when the message does not belong to the user', async () => {
      prisma.message.findUnique.mockResolvedValue({ id: 1, role: 'assistant', conversation: { userId: 2 } });

      await expect(service.upsert(1, 1, 'like')).rejects.toThrow(NotFoundException);
      expect(prisma.feedback.upsert).not.toHaveBeenCalled();
    });

    it('throws when the message is not from the assistant', async () => {
      prisma.message.findUnique.mockResolvedValue({ id: 1, role: 'user', conversation: { userId: 1 } });

      await expect(service.upsert(1, 1, 'like')).rejects.toThrow(NotFoundException);
      expect(prisma.feedback.upsert).not.toHaveBeenCalled();
    });

    it('upserts by messageId so switching like/dislike never creates a second row', async () => {
      prisma.message.findUnique.mockResolvedValue({ id: 1, role: 'assistant', conversation: { userId: 1 } });

      await service.upsert(1, 1, 'dislike', 'no me ayudó');

      expect(prisma.feedback.upsert).toHaveBeenCalledWith({
        where: { messageId: 1 },
        create: { messageId: 1, userId: 1, type: 'dislike', comment: 'no me ayudó' },
        update: { type: 'dislike', comment: 'no me ayudó' },
      });
    });
  });

  describe('remove', () => {
    it('throws when there is no feedback to delete', async () => {
      prisma.message.findUnique.mockResolvedValue({ id: 1, role: 'assistant', conversation: { userId: 1 } });
      prisma.feedback.findUnique.mockResolvedValue(null);

      await expect(service.remove(1, 1)).rejects.toThrow(NotFoundException);
      expect(prisma.feedback.delete).not.toHaveBeenCalled();
    });

    it('deletes the feedback when it exists and belongs to the user', async () => {
      prisma.message.findUnique.mockResolvedValue({ id: 1, role: 'assistant', conversation: { userId: 1 } });
      prisma.feedback.findUnique.mockResolvedValue({ messageId: 1 });

      await service.remove(1, 1);

      expect(prisma.feedback.delete).toHaveBeenCalledWith({ where: { messageId: 1 } });
    });
  });
});
