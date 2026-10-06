import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class FeedbackService {
    constructor(private readonly prisma: PrismaService) { }

    async upsert(messageId: number, userId: number, type: 'like' | 'dislike', comment?: string) {
        await this.verificarMensajeDelUsuario(messageId, userId);

        return this.prisma.feedback.upsert({
            where: { messageId },
            create: { messageId, userId, type, comment },
            update: { type, comment },
        });
    }

    async remove(messageId: number, userId: number) {
        await this.verificarMensajeDelUsuario(messageId, userId);

        const feedback = await this.prisma.feedback.findUnique({ where: { messageId } });
        if (!feedback) {
            throw new NotFoundException('No hay feedback registrado para este mensaje');
        }

        await this.prisma.feedback.delete({ where: { messageId } });
    }

    private async verificarMensajeDelUsuario(messageId: number, userId: number) {
        const message = await this.prisma.message.findUnique({
            where: { id: messageId },
            include: { conversation: true },
        });

        if (!message || message.role !== 'assistant' || message.conversation.userId !== userId) {
            throw new NotFoundException('Mensaje no encontrado');
        }

        return message;
    }
}
