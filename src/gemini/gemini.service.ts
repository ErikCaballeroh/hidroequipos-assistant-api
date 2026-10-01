import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class GeminiService {
    constructor(private readonly prisma: PrismaService) { }

    private readonly API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

    async generar(
        prompt: string,
        // Ambas tareas (condensación y diagnóstico) usan gemini-3.5-flash-lite por
        // restricción real de cuota gratuita — ver nota en CLAUDE.md y guia_desarrollo_solucion1.md.
        // El parámetro queda explícito (en vez de hardcodear el modelo) para poder
        // cambiarlo fácilmente si la cuota mejora más adelante.
        modelo: string = 'gemini-3.5-flash-lite',
        messageId?: number,
    ): Promise<string> {
        const inicio = Date.now();
        try {
            const respuesta = await fetch(
                `${this.API_URL}/${modelo}:generateContent?key=${process.env.GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
                },
            );

            if (!respuesta.ok) {
                const codigoError = respuesta.status === 429 ? 'RATE_LIMIT_EXCEEDED' : `HTTP_${respuesta.status}`;
                await this.registrarLog(messageId, false, codigoError, Date.now() - inicio);
                throw new Error(`Error de Gemini (generación): ${codigoError}`);
            }

            const data = await respuesta.json();
            const texto = data.candidates[0].content.parts[0].text;
            await this.registrarLog(messageId, true, null, Date.now() - inicio);
            return texto;
        } catch (error) {
            if (!(error instanceof Error && error.message.startsWith('Error de Gemini'))) {
                await this.registrarLog(messageId, false, 'TIMEOUT_O_RED', Date.now() - inicio);
            }
            throw error;
        }
    }

    private async registrarLog(
        messageId: number | undefined,
        success: boolean,
        errorCode: string | null,
        responseTimeMs: number,
    ) {
        await this.prisma.geminiLog.create({
            data: { messageId, success, errorCode: errorCode ?? undefined, responseTimeMs },
        });
    }
}
