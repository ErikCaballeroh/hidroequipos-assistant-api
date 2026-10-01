import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi } from 'vitest';
import { ConversationsController } from './conversations.controller.js';
import { ConversationsService } from './conversations.service.js';

describe('ConversationsController', () => {
  let controller: ConversationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationsController],
      providers: [
        {
          provide: ConversationsService,
          useValue: {
            crear: vi.fn(),
            listarPorUsuario: vi.fn(),
            procesarMensaje: vi.fn(),
            listarMensajes: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ConversationsController>(ConversationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
