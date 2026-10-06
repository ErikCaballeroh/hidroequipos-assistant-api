import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationsController } from './conversations.controller.js';
import { ConversationsService } from './conversations.service.js';

describe('ConversationsController', () => {
  let controller: ConversationsController;
  let service: {
    crear: ReturnType<typeof vi.fn>;
    listarPorUsuario: ReturnType<typeof vi.fn>;
    procesarMensaje: ReturnType<typeof vi.fn>;
    listarMensajes: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    service = {
      crear: vi.fn(),
      listarPorUsuario: vi.fn(),
      procesarMensaje: vi.fn(),
      listarMensajes: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationsController],
      providers: [
        {
          provide: ConversationsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<ConversationsController>(ConversationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('sendMessage() forwards the authenticated userId to the service', () => {
    controller.sendMessage('1', { content: 'hola' }, { user: { userId: 7 } });

    expect(service.procesarMensaje).toHaveBeenCalledWith(1, 7, 'hola');
  });

  it('getMessages() forwards the authenticated userId to the service', () => {
    controller.getMessages('1', { user: { userId: 7 } });

    expect(service.listarMensajes).toHaveBeenCalledWith(1, 7);
  });
});
