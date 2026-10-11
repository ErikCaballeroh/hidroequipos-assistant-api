import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge-base.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmbeddingsService } from '../embeddings/embeddings.service.js';
import { Prisma } from '../generated/prisma/client.js';

describe('KnowledgeBaseService', () => {
  let service: KnowledgeBaseService;
  let prisma: {
    knowledgeBase: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    $executeRaw: ReturnType<typeof vi.fn>;
  };
  let embeddingsService: { generarEmbedding: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    prisma = {
      knowledgeBase: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      $executeRaw: vi.fn(),
    };
    embeddingsService = { generarEmbedding: vi.fn().mockResolvedValue([0.1, 0.2]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeBaseService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmbeddingsService, useValue: embeddingsService },
      ],
    }).compile();

    service = module.get<KnowledgeBaseService>(KnowledgeBaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('lists without a search filter when search is omitted', async () => {
      await service.findAll({ page: 1, pageSize: 20 });

      expect(prisma.knowledgeBase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined, skip: 0, take: 20 }),
      );
      expect(prisma.knowledgeBase.count).toHaveBeenCalledWith({ where: undefined });
    });

    it('filters by title, case-insensitive, when search is given', async () => {
      await service.findAll({ page: 1, pageSize: 20, search: 'algas' });

      expect(prisma.knowledgeBase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { title: { contains: 'algas', mode: 'insensitive' } },
        }),
      );
    });

    it('computes skip/take from page and pageSize', async () => {
      await service.findAll({ page: 2, pageSize: 10 });

      expect(prisma.knowledgeBase.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
    });
  });

  describe('create', () => {
    it('regenerates the embedding from title and description', async () => {
      prisma.knowledgeBase.create.mockResolvedValue({ id: 1, title: 'Algas', description: 'Agua verde' });

      await service.create({ title: 'Algas', description: 'Agua verde' });

      expect(embeddingsService.generarEmbedding).toHaveBeenCalledWith('Algas: Agua verde');
      expect(prisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('regenerates the embedding when title or description changes', async () => {
      prisma.knowledgeBase.update.mockResolvedValue({ id: 1, title: 'Algas verdes', description: 'Agua verde' });

      await service.update(1, { title: 'Algas verdes' });

      expect(embeddingsService.generarEmbedding).toHaveBeenCalledWith('Algas verdes: Agua verde');
    });

    it('does not touch the embedding when nothing relevant changes', async () => {
      prisma.knowledgeBase.update.mockResolvedValue({ id: 1, title: 'Algas', description: 'Agua verde' });

      await service.update(1, {});

      expect(embeddingsService.generarEmbedding).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the row when there is no reference from message_knowledge', async () => {
      await service.remove(1);

      expect(prisma.knowledgeBase.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('maps a foreign key violation to ConflictException', async () => {
      prisma.knowledgeBase.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('FK violation', { code: 'P2003', clientVersion: '7.10.0' }),
      );

      await expect(service.remove(1)).rejects.toThrow(ConflictException);
    });
  });
});
