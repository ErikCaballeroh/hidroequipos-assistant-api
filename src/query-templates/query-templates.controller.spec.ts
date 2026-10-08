import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryTemplatesController } from './query-templates.controller.js';
import { QueryTemplatesService } from './query-templates.service.js';

describe('QueryTemplatesController', () => {
  let controller: QueryTemplatesController;
  let service: {
    listarActivas: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    service = {
      listarActivas: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueryTemplatesController],
      providers: [
        {
          provide: QueryTemplatesService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<QueryTemplatesController>(QueryTemplatesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('update() parsea el id a número', () => {
    controller.update('5', { displayOrder: 1 });

    expect(service.update).toHaveBeenCalledWith(5, { displayOrder: 1 });
  });

  it('remove() parsea el id a número', () => {
    controller.remove('5');

    expect(service.remove).toHaveBeenCalledWith(5);
  });
});
