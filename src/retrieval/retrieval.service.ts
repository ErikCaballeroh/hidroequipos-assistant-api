import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmbeddingsService } from '../embeddings/embeddings.service.js';

@Injectable()
export class RetrievalService {
    private readonly UMBRAL_CONFIANZA = Number(process.env.CONFIDENCE_THRESHOLD ?? 0.6);
    // Subido de 5 a 10: con TOP_K=5, una familia de producto con varias
    // variantes por tamaño (ej. Alguicida x4) podía llenar todo el TOP_K y
    // dejar fuera productos complementarios relevantes (ej. "algas" traía
    // solo Alguicida, sin Shock/Tricloro, aunque knowledge_base diga que van
    // juntos). Deduplicar por nombre base se descartó: el patrón de variantes
    // no es uniforme entre categorías (el tamaño va al final en químicos, pero
    // en bombeo el voltaje aparece en medio del nombre), así que un regex
    // genérico de "nombre base" sería frágil y agruparía mal.
    private readonly TOP_K = 10;

    constructor(
        private readonly prisma: PrismaService,
        private readonly embeddingsService: EmbeddingsService,
    ) { }

    async buscarContexto(consulta: string) {
        const embedding = await this.embeddingsService.generarEmbedding(consulta);
        const vectorSql = `[${embedding.join(',')}]`;

        const [productos, articulos] = await Promise.all([
            this.prisma.$queryRaw<any[]>`
        SELECT id, sku, name, description, price, stock, embedding <=> ${vectorSql}::vector AS distance
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
