import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryTemplatesService } from './query-templates.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('QueryTemplatesService', () => {
  let service: QueryTemplatesService;
  let prisma: {
    queryTemplate: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      queryTemplate: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
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
    await service.listarActivas({ page: 1, pageSize: 20 });

    expect(prisma.queryTemplate.findMany).toHaveBeenCalledWith({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
      skip: 0,
      take: 20,
    });
    expect(prisma.queryTemplate.count).toHaveBeenCalledWith({ where: { active: true } });
  });

  it('filtra por título o texto de consulta, case-insensitive, cuando se pasa search', async () => {
    await service.listarActivas({ page: 1, pageSize: 20, search: 'algas' });

    expect(prisma.queryTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          active: true,
          OR: [
            { title: { contains: 'algas', mode: 'insensitive' } },
            { queryText: { contains: 'algas', mode: 'insensitive' } },
          ],
        },
      }),
    );
  });

  it('calcula skip/take a partir de page y pageSize', async () => {
    await service.listarActivas({ page: 2, pageSize: 10 });

    expect(prisma.queryTemplate.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
  });

  describe('listarTodas', () => {
    it('sin active ni search, no aplica ningún filtro (devuelve activas e inactivas)', async () => {
      await service.listarTodas({ page: 1, pageSize: 20 });

      expect(prisma.queryTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined, skip: 0, take: 20 }),
      );
      expect(prisma.queryTemplate.count).toHaveBeenCalledWith({ where: undefined });
    });

    it('con active=false, filtra solo las inactivas', async () => {
      await service.listarTodas({ page: 1, pageSize: 20, active: false });

      expect(prisma.queryTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { active: false } }),
      );
    });

    it('con active=true, filtra solo las activas', async () => {
      await service.listarTodas({ page: 1, pageSize: 20, active: true });

      expect(prisma.queryTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { active: true } }),
      );
    });

    it('filtra por título o texto de consulta, case-insensitive, cuando se pasa search', async () => {
      await service.listarTodas({ page: 1, pageSize: 20, search: 'algas' });

      expect(prisma.queryTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { title: { contains: 'algas', mode: 'insensitive' } },
              { queryText: { contains: 'algas', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('combina active y search cuando se pasan ambos', async () => {
      await service.listarTodas({ page: 1, pageSize: 20, active: false, search: 'algas' });

      expect(prisma.queryTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            active: false,
            OR: [
              { title: { contains: 'algas', mode: 'insensitive' } },
              { queryText: { contains: 'algas', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('calcula skip/take a partir de page y pageSize', async () => {
      await service.listarTodas({ page: 2, pageSize: 10 });

      expect(prisma.queryTemplate.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
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
