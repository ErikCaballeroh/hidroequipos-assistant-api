import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeedbackController } from './feedback.controller.js';
import { FeedbackService } from './feedback.service.js';

describe('FeedbackController', () => {
  let controller: FeedbackController;
  let service: { upsert: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    service = { upsert: vi.fn(), remove: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedbackController],
      providers: [{ provide: FeedbackService, useValue: service }],
    }).compile();

    controller = module.get<FeedbackController>(FeedbackController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('upsert() forwards the authenticated userId and dto fields', () => {
    controller.upsert('1', { type: 'like' }, { user: { userId: 7 } });

    expect(service.upsert).toHaveBeenCalledWith(1, 7, 'like', undefined);
  });

  it('remove() forwards the authenticated userId', () => {
    controller.remove('1', { user: { userId: 7 } });

    expect(service.remove).toHaveBeenCalledWith(1, 7);
  });
});
