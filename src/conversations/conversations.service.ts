import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { GeminiService } from '../gemini/gemini.service.js';
import { RetrievalService } from '../retrieval/retrieval.service.js';
import { PromptBuilderService } from '../prompt-builder/prompt-builder.service.js';
import type { Message } from '../generated/prisma/client.js';

@Injectable()
export class ConversationsService {
    private readonly MAX_HISTORIAL = 6;

    constructor(
        private readonly prisma: PrismaService,
        private readonly geminiService: GeminiService,
        private readonly retrievalService: RetrievalService,
        private readonly promptBuilder: PromptBuilderService,
    ) { }

    crear(userId: number) {
        return this.prisma.conversation.create({ data: { userId } });
    }

    listarPorUsuario(userId: number) {
        return this.prisma.conversation.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
        });
    }

    listarMensajes(conversationId: number) {
        return this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' },
        });
    }

    async procesarMensaje(conversationId: number, textoUsuario: string) {
        const historial = await this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'desc' },
            take: this.MAX_HISTORIAL,
        });
        historial.reverse();

        await this.prisma.message.create({
            data: { conversationId, role: 'user', content: textoUsuario },
        });

        const consultaCondensada = await this.condensarConsulta(historial, textoUsuario);
        const contexto = await this.retrievalService.buscarContexto(consultaCondensada);
        const prompt = this.promptBuilder.construir(historial, textoUsuario, contexto);
        const respuesta = await this.geminiService.generar(prompt, 'gemini-3.5-flash-lite');

        const mensajeAsistente = await this.prisma.message.create({
            data: {
                conversationId,
                role: 'assistant',
                content: respuesta,
                bestMatchDistance: contexto.mejorDistancia,
            },
        });

        if (contexto.hayContextoSuficiente) {
            await this.prisma.messageProduct.createMany({
                data: contexto.productos.map((p: any) => ({
                    messageId: mensajeAsistente.id,
                    productId: p.id,
                    similarityDistance: p.distance,
                })),
            });
            await this.prisma.messageKnowledge.createMany({
                data: contexto.articulos.map((a: any) => ({
                    messageId: mensajeAsistente.id,
                    knowledgeBaseId: a.id,
                    similarityDistance: a.distance,
                })),
            });
        }

        return mensajeAsistente;
    }

    private async condensarConsulta(historial: Message[], mensajeNuevo: string): Promise<string> {
        if (historial.length === 0) return mensajeNuevo;
        const historialTexto = historial
            .map(m => `${m.role === 'user' ? 'Empleado' : 'Asistente'}: ${m.content}`)
            .join('\n');
        const prompt = `Dado el historial y una pregunta de seguimiento, reescribe la pregunta
como una consulta autónoma. Responde SOLO con la consulta reescrita.

Historial:
${historialTexto}

Pregunta de seguimiento: ${mensajeNuevo}

Consulta autónoma:`;
        return this.geminiService.generar(prompt, 'gemini-3.5-flash-lite');
    }
}
