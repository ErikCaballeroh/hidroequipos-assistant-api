import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmbeddingsService } from '../embeddings/embeddings.service.js';

@Injectable()
export class RetrievalService {
    private readonly UMBRAL_CONFIANZA = Number(process.env.CONFIDENCE_THRESHOLD ?? 0.6);
    // TODO: TOP_K=5 es insuficiente con catálogos que tienen muchas variantes
    // por tamaño (ej. Alguicida x4, Tricloro x20). Una consulta fuerte hacia una
    // familia de producto puede llenar todo el TOP_K con esa familia y dejar
    // fuera productos complementarios relevantes (ej. "algas" trae solo
    // Alguicida, sin Shock/Tricloro, aunque knowledge_base diga que van juntos).
    // Opciones a evaluar: subir TOP_K, o deduplicar por nombre base de producto
    // antes de construir el prompt.
    private readonly TOP_K = 5;

    constructor(
        private readonly prisma: PrismaService,
        private readonly embeddingsService: EmbeddingsService,
    ) { }

    async buscarContexto(consulta: string) {
        const embedding = await this.embeddingsService.generarEmbedding(consulta);
        const vectorSql = `[${embedding.join(',')}]`;

        const [productos, articulos] = await Promise.all([
            this.prisma.$queryRaw<any[]>`
        SELECT id, name, description, price, stock, embedding <=> ${vectorSql}::vector AS distance
        FROM products WHERE active = TRUE ORDER BY distance ASC LIMIT ${this.TOP_K}
      `,
            this.prisma.$queryRaw<any[]>`
        SELECT id, title, description, embedding <=> ${vectorSql}::vector AS distance
        FROM knowledge_base ORDER BY distance ASC LIMIT ${this.TOP_K}
      `,
        ]);

        const mejorDistancia = Math.min(
            productos[0]?.distance ?? Infinity,
            articulos[0]?.distance ?? Infinity,
        );

        return {
            productos,
            articulos,
            mejorDistancia,
            hayContextoSuficiente: mejorDistancia <= this.UMBRAL_CONFIANZA,
        };
    }
}
