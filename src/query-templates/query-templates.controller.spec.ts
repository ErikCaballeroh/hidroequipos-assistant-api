import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryTemplatesController } from './query-templates.controller.js';
import { QueryTemplatesService } from './query-templates.service.js';

describe('QueryTemplatesController', () => {
  let controller: QueryTemplatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueryTemplatesController],
      providers: [
        {
          provide: QueryTemplatesService,
          useValue: { listarActivas: vi.fn() },
        },
      ],
    }).compile();

    controller = module.get<QueryTemplatesController>(QueryTemplatesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
