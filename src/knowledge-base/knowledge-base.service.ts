import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmbeddingsService } from '../embeddings/embeddings.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto.js';
import { UpdateKnowledgeBaseDto } from './dto/update-knowledge-base.dto.js';
import { FindKnowledgeBaseQueryDto } from './dto/find-knowledge-base-query.dto.js';

@Injectable()
export class KnowledgeBaseService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly embeddingsService: EmbeddingsService,
    ) { }

    async findAll(query: FindKnowledgeBaseQueryDto) {
        const where = query.search
            ? { title: { contains: query.search, mode: 'insensitive' as const } }
            : undefined;

        const [items, total] = await Promise.all([
            this.prisma.knowledgeBase.findMany({
                where,
                orderBy: { id: 'asc' },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
            }),
            this.prisma.knowledgeBase.count({ where }),
        ]);

        return { items, page: query.page, pageSize: query.pageSize, total };
    }

    async create(dto: CreateKnowledgeBaseDto) {
        const articulo = await this.prisma.knowledgeBase.create({ data: dto });
        await this.actualizarEmbedding(articulo.id, articulo.title, articulo.description);
        return articulo;
    }

    async update(id: number, dto: UpdateKnowledgeBaseDto) {
        const articulo = await this.prisma.knowledgeBase.update({ where: { id }, data: dto });
        if (dto.title !== undefined || dto.description !== undefined) {
            await this.actualizarEmbedding(articulo.id, articulo.title, articulo.description);
        }
        return articulo;
    }

    async remove(id: number) {
        try {
            await this.prisma.knowledgeBase.delete({ where: { id } });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
                throw new ConflictException(
                    'No se puede eliminar: este artículo está referenciado en la traza de mensajes existentes.',
                );
            }
            throw error;
        }
    }

    private async actualizarEmbedding(id: number, title: string, description: string) {
        const embedding = await this.embeddingsService.generarEmbedding(`${title}: ${description}`);
        const vectorSql = `[${embedding.join(',')}]`;
        await this.prisma.$executeRaw`UPDATE knowledge_base SET embedding = ${vectorSql}::vector WHERE id = ${id}`;
    }
}
