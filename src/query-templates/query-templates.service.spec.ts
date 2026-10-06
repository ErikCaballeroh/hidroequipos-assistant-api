import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryTemplatesService } from './query-templates.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('QueryTemplatesService', () => {
  let service: QueryTemplatesService;
  let prisma: { queryTemplate: { findMany: ReturnType<typeof vi.fn> } };

  beforeEach(async () => {
    prisma = { queryTemplate: { findMany: vi.fn() } };

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
});
