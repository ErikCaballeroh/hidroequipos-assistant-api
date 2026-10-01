import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi } from 'vitest';
import { ConversationsService } from './conversations.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GeminiService } from '../gemini/gemini.service.js';
import { RetrievalService } from '../retrieval/retrieval.service.js';
import { PromptBuilderService } from '../prompt-builder/prompt-builder.service.js';

describe('ConversationsService', () => {
  let service: ConversationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        {
          provide: PrismaService,
          useValue: {
            conversation: {
              create: vi.fn(),
              findMany: vi.fn(),
            },
            message: {
              create: vi.fn(),
              findMany: vi.fn(),
            },
            messageProduct: {
              createMany: vi.fn(),
            },
            messageKnowledge: {
              createMany: vi.fn(),
            },
          },
        },
        {
          provide: GeminiService,
          useValue: { generar: vi.fn() },
        },
        {
          provide: RetrievalService,
          useValue: { buscarContexto: vi.fn() },
        },
        {
          provide: PromptBuilderService,
          useValue: { construir: vi.fn() },
        },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
