import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi } from 'vitest';
import { GeminiService } from './gemini.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('GeminiService', () => {
  let service: GeminiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiService,
        {
          provide: PrismaService,
          useValue: {
            geminiLog: {
              create: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<GeminiService>(GeminiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
