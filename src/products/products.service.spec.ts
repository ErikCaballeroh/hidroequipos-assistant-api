import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductsService } from './products.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmbeddingsService } from '../embeddings/embeddings.service.js';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: {
    product: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    $executeRaw: ReturnType<typeof vi.fn>;
  };
  let embeddingsService: { generarEmbedding: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    prisma = {
      product: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        update: vi.fn(),
      },
      $executeRaw: vi.fn(),
    };
    embeddingsService = { generarEmbedding: vi.fn().mockResolvedValue([0.1, 0.2]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmbeddingsService, useValue: embeddingsService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('lists without a search filter when search is omitted', async () => {
      await service.findAll({ page: 1, pageSize: 20 });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined, skip: 0, take: 20 }),
      );
      expect(prisma.product.count).toHaveBeenCalledWith({ where: undefined });
    });

    it('filters by name or sku, case-insensitive, when search is given', async () => {
      await service.findAll({ page: 1, pageSize: 20, search: 'cloro' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'cloro', mode: 'insensitive' } },
              { sku: { contains: 'cloro', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('computes skip/take from page and pageSize', async () => {
      await service.findAll({ page: 2, pageSize: 10 });

      expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
    });
  });

  describe('create', () => {
    it('regenerates the embedding from name and description', async () => {
      prisma.product.create.mockResolvedValue({ id: 1, name: 'Cloro', description: 'Granulado' });

      await service.create({ name: 'Cloro', description: 'Granulado' });

      expect(embeddingsService.generarEmbedding).toHaveBeenCalledWith('Cloro: Granulado');
      expect(prisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('regenerates the embedding when name or description changes', async () => {
      prisma.product.update.mockResolvedValue({ id: 1, name: 'Cloro nuevo', description: 'Granulado' });

      await service.update(1, { name: 'Cloro nuevo' });

      expect(embeddingsService.generarEmbedding).toHaveBeenCalledWith('Cloro nuevo: Granulado');
    });

    it('does not touch the embedding when neither name nor description changes', async () => {
      prisma.product.update.mockResolvedValue({ id: 1, name: 'Cloro', description: 'Granulado', stock: 10 });

      await service.update(1, { stock: 10 });

      expect(embeddingsService.generarEmbedding).not.toHaveBeenCalled();
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('sets active to false instead of deleting the row', async () => {
      await service.deactivate(1);

      expect(prisma.product.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { active: false } });
    });
  });
});
