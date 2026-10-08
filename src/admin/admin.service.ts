import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { StatsQueryDto } from './dto/stats-query.dto.js';
import { GeminiLogsQueryDto } from './dto/gemini-logs-query.dto.js';
import { MessagesQueryDto } from './dto/messages-query.dto.js';

const TREINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;
const TOP_PRODUCTS_LIMIT = 5;
const NO_MATCH_RECENT_LIMIT = 3;

@Injectable()
export class AdminService {
    private readonly UMBRAL_CONFIANZA = Number(process.env.CONFIDENCE_THRESHOLD ?? 0.6);

    constructor(private readonly prisma: PrismaService) { }

    async getStats(query: StatsQueryDto) {
        const { desde, hasta } = this.resolverRango(query.from, query.to);

        const [topProducts, likes, dislikes, noMatchCount, noMatchRecent] = await Promise.all([
            this.prisma.$queryRaw<any[]>`
        SELECT p.id AS "productId", p.sku, p.name, COUNT(*)::int AS count
        FROM message_product mp
        JOIN messages m ON m.id = mp.message_id
        JOIN products p ON p.id = mp.product_id
        WHERE m.role = 'assistant'
          AND m.created_at BETWEEN ${desde} AND ${hasta}
          AND m.best_match_distance IS NOT NULL
          AND m.best_match_distance <= ${this.UMBRAL_CONFIANZA}
        GROUP BY p.id, p.sku, p.name
        ORDER BY count DESC
        LIMIT ${TOP_PRODUCTS_LIMIT}
      `,
            this.prisma.feedback.count({ where: { type: 'like', createdAt: { gte: desde, lte: hasta } } }),
            this.prisma.feedback.count({ where: { type: 'dislike', createdAt: { gte: desde, lte: hasta } } }),
            this.prisma.message.count({
                where: {
                    role: 'assistant',
                    createdAt: { gte: desde, lte: hasta },
                    OR: [{ bestMatchDistance: null }, { bestMatchDistance: { gt: this.UMBRAL_CONFIANZA } }],
                },
            }),
            this.prisma.$queryRaw<any[]>`
        SELECT m.id AS "messageId", m.created_at AS "createdAt", q.content AS question
        FROM messages m
        LEFT JOIN LATERAL (
          SELECT content FROM messages u
          WHERE u.conversation_id = m.conversation_id AND u.role = 'user' AND u.id < m.id
          ORDER BY u.id DESC LIMIT 1
        ) q ON TRUE
        WHERE m.role = 'assistant'
          AND m.created_at BETWEEN ${desde} AND ${hasta}
          AND (m.best_match_distance IS NULL OR m.best_match_distance > ${this.UMBRAL_CONFIANZA})
        ORDER BY m.created_at DESC
        LIMIT ${NO_MATCH_RECENT_LIMIT}
      `,
        ]);

        const total = likes + dislikes;

        return {
            topProducts,
            feedback: {
                likes,
                dislikes,
                total,
                approvalRate: total === 0 ? null : Math.round((likes / total) * 100) / 100,
            },
            noMatch: {
                count: noMatchCount,
                recent: noMatchRecent,
            },
        };
    }

    async getGeminiLogs(query: GeminiLogsQueryDto) {
        const where = query.success === undefined ? {} : { success: query.success };

        const [items, total] = await Promise.all([
            this.prisma.geminiLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
            }),
            this.prisma.geminiLog.count({ where }),
        ]);

        return { items, page: query.page, pageSize: query.pageSize, total };
    }

    async getMessages(query: MessagesQueryDto) {
        const condiciones = [Prisma.sql`m.role = 'assistant'`];
        if (query.noMatch) {
            condiciones.push(
                Prisma.sql`(m.best_match_distance IS NULL OR m.best_match_distance > ${this.UMBRAL_CONFIANZA})`,
            );
        }
        if (query.feedback) {
            condiciones.push(Prisma.sql`f.type = ${query.feedback}`);
        }
        const whereSql = Prisma.join(condiciones, ' AND ');

        const whereCount: any = { role: 'assistant' };
        if (query.noMatch) {
            whereCount.OR = [{ bestMatchDistance: null }, { bestMatchDistance: { gt: this.UMBRAL_CONFIANZA } }];
        }
        if (query.feedback) {
            whereCount.feedback = { type: query.feedback };
        }

        const offset = (query.page - 1) * query.pageSize;

        const [items, total] = await Promise.all([
            this.prisma.$queryRaw<any[]>`
        SELECT m.id, m.created_at AS "createdAt", q.content AS question,
               LEFT(m.content, 100) AS "answerPreview", f.type AS feedback,
               m.best_match_distance AS "bestMatchDistance"
        FROM messages m
        LEFT JOIN LATERAL (
          SELECT content FROM messages u
          WHERE u.conversation_id = m.conversation_id AND u.role = 'user' AND u.id < m.id
          ORDER BY u.id DESC LIMIT 1
        ) q ON TRUE
        LEFT JOIN feedback f ON f.message_id = m.id
        WHERE ${whereSql}
        ORDER BY m.id DESC
        LIMIT ${query.pageSize} OFFSET ${offset}
      `,
            this.prisma.message.count({ where: whereCount }),
        ]);

        return { items, page: query.page, pageSize: query.pageSize, total };
    }

    async getMessageTrace(id: number) {
        const message = await this.prisma.message.findUnique({ where: { id }, include: { feedback: true } });
        if (!message || message.role !== 'assistant') {
            throw new NotFoundException('Mensaje no encontrado');
        }

        const preguntaAnterior = await this.prisma.message.findFirst({
            where: { conversationId: message.conversationId, role: 'user', id: { lt: message.id } },
            orderBy: { id: 'desc' },
        });

        const [productos, articulos] = await Promise.all([
            this.prisma.$queryRaw<any[]>`
        SELECT p.id, p.sku, p.name, mp.similarity_distance AS distance
        FROM message_product mp
        JOIN products p ON p.id = mp.product_id
        WHERE mp.message_id = ${id}
        ORDER BY mp.similarity_distance ASC
      `,
            this.prisma.$queryRaw<any[]>`
        SELECT kb.id, kb.title, mk.similarity_distance AS distance
        FROM message_knowledge mk
        JOIN knowledge_base kb ON kb.id = mk.knowledge_base_id
        WHERE mk.message_id = ${id}
        ORDER BY mk.similarity_distance ASC
      `,
        ]);

        return {
            message: {
                id: message.id,
                content: message.content,
                createdAt: message.createdAt,
                responseTimeMs: message.responseTimeMs,
                bestMatchDistance: message.bestMatchDistance,
            },
            question: preguntaAnterior?.content ?? null,
            feedback: message.feedback
                ? { type: message.feedback.type, comment: message.feedback.comment }
                : null,
            products: productos.map((p) => ({
                id: p.id,
                sku: p.sku,
                name: p.name,
                distance: p.distance,
                similarity: this.redondearSimilitud(p.distance),
            })),
            knowledge: articulos.map((a) => ({
                id: a.id,
                title: a.title,
                distance: a.distance,
                similarity: this.redondearSimilitud(a.distance),
            })),
        };
    }

    private redondearSimilitud(distance: number): number {
        return Math.round((1 - distance) * 100) / 100;
    }

    private resolverRango(from?: string, to?: string) {
        const hasta = to ? new Date(to) : new Date();
        const desde = from ? new Date(from) : new Date(hasta.getTime() - TREINTA_DIAS_MS);
        return { desde, hasta };
    }
}
