import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmbeddingsService } from './embeddings.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('EmbeddingsService', () => {
  let service: EmbeddingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingsService,
        {
          provide: PrismaService,
          useValue: { geminiLog: { create: vi.fn() } },
        },
      ],
    }).compile();

    service = module.get<EmbeddingsService>(EmbeddingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
