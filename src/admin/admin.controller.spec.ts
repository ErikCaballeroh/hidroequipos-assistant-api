import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

describe('AdminController', () => {
  let controller: AdminController;
  let service: {
    getStats: ReturnType<typeof vi.fn>;
    getGeminiLogs: ReturnType<typeof vi.fn>;
    getMessages: ReturnType<typeof vi.fn>;
    getMessageTrace: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    service = {
      getStats: vi.fn(),
      getGeminiLogs: vi.fn(),
      getMessages: vi.fn(),
      getMessageTrace: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: service }],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getMessageTrace() parses the id to a number', () => {
    controller.getMessageTrace('91');

    expect(service.getMessageTrace).toHaveBeenCalledWith(91);
  });
});
