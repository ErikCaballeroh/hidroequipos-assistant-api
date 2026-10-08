import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryTemplatesService } from './query-templates.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('QueryTemplatesService', () => {
  let service: QueryTemplatesService;
  let prisma: {
    queryTemplate: {
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      queryTemplate: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryTemplatesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<QueryTemplatesService>(QueryTemplatesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('lista solo las plantillas activas ordenadas por displayOrder', async () => {
    await service.listarActivas();

    expect(prisma.queryTemplate.findMany).toHaveBeenCalledWith({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
    });
  });

  it('create() pasa el dto directamente a Prisma', async () => {
    const dto = { title: 'Agua verde', queryText: 'el agua está verde' };

    await service.create(dto);

    expect(prisma.queryTemplate.create).toHaveBeenCalledWith({ data: dto });
  });

  it('update() actualiza por id', async () => {
    await service.update(1, { displayOrder: 2 });

    expect(prisma.queryTemplate.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { displayOrder: 2 },
    });
  });

  it('remove() elimina por id', async () => {
    await service.remove(1);

    expect(prisma.queryTemplate.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
