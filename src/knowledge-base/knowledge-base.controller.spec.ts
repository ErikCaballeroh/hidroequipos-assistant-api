import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KnowledgeBaseController } from './knowledge-base.controller.js';
import { KnowledgeBaseService } from './knowledge-base.service.js';

describe('KnowledgeBaseController', () => {
  let controller: KnowledgeBaseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeBaseController],
      providers: [
        {
          provide: KnowledgeBaseService,
          useValue: { findAll: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
        },
      ],
    }).compile();

    controller = module.get<KnowledgeBaseController>(KnowledgeBaseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
