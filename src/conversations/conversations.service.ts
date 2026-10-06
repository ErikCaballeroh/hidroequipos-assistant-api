import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { GeminiService } from '../gemini/gemini.service.js';
import { RetrievalService } from '../retrieval/retrieval.service.js';
import { PromptBuilderService } from '../prompt-builder/prompt-builder.service.js';
import type { Message } from '../generated/prisma/client.js';

@Injectable()
export class ConversationsService {
    private readonly MAX_HISTORIAL = 6;
    private readonly LONGITUD_TITULO = 60;

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

    async listarMensajes(conversationId: number, userId: number) {
        await this.verificarPropiedad(conversationId, userId);
        return this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' },
            include: { feedback: true },
        });
    }

    async procesarMensaje(conversationId: number, userId: number, textoUsuario: string) {
        const conversation = await this.verificarPropiedad(conversationId, userId);

        const historial = await this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'desc' },
            take: this.MAX_HISTORIAL,
        });
        historial.reverse();

        await this.prisma.message.create({
            data: { conversationId, role: 'user', content: textoUsuario },
        });

        if (!conversation.title) {
            await this.prisma.conversation.update({
                where: { id: conversationId },
                data: { title: textoUsuario.slice(0, this.LONGITUD_TITULO) },
            });
        }

        let contexto: Awaited<ReturnType<RetrievalService['buscarContexto']>>;
        let respuesta: string;
        const inicio = Date.now();
        try {
            const consultaCondensada = await this.condensarConsulta(historial, textoUsuario);
            contexto = await this.retrievalService.buscarContexto(consultaCondensada);
            const prompt = this.promptBuilder.construir(historial, textoUsuario, contexto);
            respuesta = await this.geminiService.generar(prompt, 'gemini-3.5-flash-lite');
        } catch {
            throw new ServiceUnavailableException(
                'El servicio de diagnóstico no está disponible en este momento. Intenta de nuevo en unos minutos.',
            );
        }
        const responseTimeMs = Date.now() - inicio;

        const mensajeAsistente = await this.prisma.message.create({
            data: {
                conversationId,
                role: 'assistant',
                content: respuesta,
                bestMatchDistance: Number.isFinite(contexto.mejorDistancia) ? contexto.mejorDistancia : null,
                responseTimeMs,
            },
        });

        const sources = { products: [] as any[], knowledge: [] as any[] };
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

            sources.products = contexto.productos.map((p: any) => ({
                id: p.id,
                sku: p.sku,
                name: p.name,
                distance: p.distance,
                similarity: this.redondearSimilitud(p.distance),
            }));
            sources.knowledge = contexto.articulos.map((a: any) => ({
                id: a.id,
                title: a.title,
                distance: a.distance,
                similarity: this.redondearSimilitud(a.distance),
            }));
        }

        return { message: mensajeAsistente, sources };
    }

    private redondearSimilitud(distance: number): number {
        return Math.round((1 - distance) * 100) / 100;
    }

    private async verificarPropiedad(conversationId: number, userId: number) {
        const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
        if (!conversation || conversation.userId !== userId) {
            throw new NotFoundException('Conversación no encontrada');
        }
        return conversation;
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
