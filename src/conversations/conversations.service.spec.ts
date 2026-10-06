import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConversationsService } from './conversations.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GeminiService } from '../gemini/gemini.service.js';
import { RetrievalService } from '../retrieval/retrieval.service.js';
import { PromptBuilderService } from '../prompt-builder/prompt-builder.service.js';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let prisma: {
    conversation: { create: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
    message: { create: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
    messageProduct: { createMany: ReturnType<typeof vi.fn> };
    messageKnowledge: { createMany: ReturnType<typeof vi.fn> };
  };
  let geminiService: { generar: ReturnType<typeof vi.fn> };
  let retrievalService: { buscarContexto: ReturnType<typeof vi.fn> };
  let promptBuilder: { construir: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    prisma = {
      conversation: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      message: {
        create: vi.fn().mockResolvedValue({ id: 91, role: 'assistant' }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      messageProduct: {
        createMany: vi.fn(),
      },
      messageKnowledge: {
        createMany: vi.fn(),
      },
    };
    geminiService = { generar: vi.fn().mockResolvedValue('diagnóstico generado') };
    retrievalService = {
      buscarContexto: vi.fn().mockResolvedValue({
        productos: [],
        articulos: [],
        mejorDistancia: Infinity,
        hayContextoSuficiente: false,
      }),
    };
    promptBuilder = { construir: vi.fn().mockReturnValue('prompt') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: GeminiService, useValue: geminiService },
        { provide: RetrievalService, useValue: retrievalService },
        { provide: PromptBuilderService, useValue: promptBuilder },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('procesarMensaje', () => {
    it('throws NotFoundException when the conversation does not belong to the user', async () => {
      prisma.conversation.findUnique.mockResolvedValue({ id: 1, userId: 2, title: null });

      await expect(service.procesarMensaje(1, 1, 'hola')).rejects.toThrow(NotFoundException);
    });

    it('sets the conversation title from the first message when it has none', async () => {
      prisma.conversation.findUnique.mockResolvedValue({ id: 1, userId: 1, title: null });

      await service.procesarMensaje(1, 1, 'el agua de la alberca está verde y tiene algas en las paredes');

      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { title: 'el agua de la alberca está verde y tiene algas en las parede' },
      });
    });

    it('does not overwrite an existing title', async () => {
      prisma.conversation.findUnique.mockResolvedValue({ id: 1, userId: 1, title: 'ya tiene título' });

      await service.procesarMensaje(1, 1, 'otro mensaje');

      expect(prisma.conversation.update).not.toHaveBeenCalled();
    });

    it('returns rounded similarity in sources and writes traceability rows when there is enough context', async () => {
      prisma.conversation.findUnique.mockResolvedValue({ id: 1, userId: 1, title: 'ya tiene título' });
      retrievalService.buscarContexto.mockResolvedValue({
        productos: [{ id: 3, sku: 'QUI-002', name: 'Cloro Granulado', distance: 0.21 }],
        articulos: [{ id: 2, title: 'Eliminación de algas', distance: 0.25 }],
        mejorDistancia: 0.21,
        hayContextoSuficiente: true,
      });

      const resultado = await service.procesarMensaje(1, 1, 'agua verde');

      expect(resultado.sources.products).toEqual([
        { id: 3, sku: 'QUI-002', name: 'Cloro Granulado', distance: 0.21, similarity: 0.79 },
      ]);
      expect(resultado.sources.knowledge).toEqual([
        { id: 2, title: 'Eliminación de algas', distance: 0.25, similarity: 0.75 },
      ]);
      expect(prisma.messageProduct.createMany).toHaveBeenCalled();
      expect(prisma.messageKnowledge.createMany).toHaveBeenCalled();
    });

    it('returns empty sources and skips traceability rows when there is no match', async () => {
      prisma.conversation.findUnique.mockResolvedValue({ id: 1, userId: 1, title: 'ya tiene título' });

      const resultado = await service.procesarMensaje(1, 1, 'pregunta sin relación');

      expect(resultado.sources).toEqual({ products: [], knowledge: [] });
      expect(prisma.messageProduct.createMany).not.toHaveBeenCalled();
      expect(prisma.messageKnowledge.createMany).not.toHaveBeenCalled();
    });

    it('persists responseTimeMs on the assistant message', async () => {
      prisma.conversation.findUnique.mockResolvedValue({ id: 1, userId: 1, title: 'ya tiene título' });

      await service.procesarMensaje(1, 1, 'pregunta');

      const llamadaMensajeAsistente = prisma.message.create.mock.calls.find(
        ([args]) => args.data.role === 'assistant',
      );
      expect(llamadaMensajeAsistente![0].data.responseTimeMs).toBeTypeOf('number');
    });

    it('throws ServiceUnavailableException when Gemini fails', async () => {
      prisma.conversation.findUnique.mockResolvedValue({ id: 1, userId: 1, title: 'ya tiene título' });
      geminiService.generar.mockRejectedValue(new Error('Error de Gemini (generación): RATE_LIMIT_EXCEEDED'));

      await expect(service.procesarMensaje(1, 1, 'pregunta')).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('listarMensajes', () => {
    it('throws NotFoundException when the conversation does not belong to the user', async () => {
      prisma.conversation.findUnique.mockResolvedValue({ id: 1, userId: 2, title: null });

      await expect(service.listarMensajes(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('returns the messages when the conversation belongs to the user', async () => {
      prisma.conversation.findUnique.mockResolvedValue({ id: 1, userId: 1, title: null });
      prisma.message.findMany.mockResolvedValue([{ id: 1 }]);

      const resultado = await service.listarMensajes(1, 1);

      expect(resultado).toEqual([{ id: 1 }]);
    });

    it('includes each message own feedback', async () => {
      prisma.conversation.findUnique.mockResolvedValue({ id: 1, userId: 1, title: null });

      await service.listarMensajes(1, 1);

      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: { conversationId: 1 },
        orderBy: { createdAt: 'asc' },
        include: { feedback: true },
      });
    });
  });
});
