import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class EmbeddingsService {
    private readonly API_URL =
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent';

    constructor(private readonly prisma: PrismaService) { }

    async generarEmbedding(texto: string): Promise<number[]> {
        const inicio = Date.now();
        try {
            const respuesta = await fetch(`${this.API_URL}?key=${process.env.GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: { parts: [{ text: texto }] },
                    outputDimensionality: 768, // trunca la salida a 768 dimensiones (MRL)
                }),
            });

            if (!respuesta.ok) {
                const codigoError = respuesta.status === 429 ? 'RATE_LIMIT_EXCEEDED' : `HTTP_${respuesta.status}`;
                await this.registrarLog(false, codigoError, Date.now() - inicio);
                throw new Error(`Error de Gemini (embeddings): ${codigoError}`);
            }

            const data = await respuesta.json();
            await this.registrarLog(true, null, Date.now() - inicio);
            return data.embedding.values;
        } catch (error) {
            if (!(error instanceof Error && error.message.startsWith('Error de Gemini'))) {
                await this.registrarLog(false, 'TIMEOUT_O_RED', Date.now() - inicio);
            }
            throw error;
        }
    }

    private async registrarLog(success: boolean, errorCode: string | null, responseTimeMs: number) {
        await this.prisma.geminiLog.create({
            data: { success, errorCode: errorCode ?? undefined, responseTimeMs },
        });
    }
}
