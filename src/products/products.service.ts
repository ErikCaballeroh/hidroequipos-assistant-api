import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmbeddingsService } from '../embeddings/embeddings.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { FindProductsQueryDto } from './dto/find-products-query.dto.js';

@Injectable()
export class ProductsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly embeddingsService: EmbeddingsService,
    ) { }

    async findAll(query: FindProductsQueryDto) {
        const where = query.search
            ? {
                OR: [
                    { name: { contains: query.search, mode: 'insensitive' as const } },
                    { sku: { contains: query.search, mode: 'insensitive' as const } },
                ],
            }
            : undefined;

        const [items, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                orderBy: { id: 'asc' },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
            }),
            this.prisma.product.count({ where }),
        ]);

        return { items, page: query.page, pageSize: query.pageSize, total };
    }

    async create(dto: CreateProductDto) {
        const producto = await this.prisma.product.create({ data: dto });
        await this.actualizarEmbedding(producto.id, producto.name, producto.description);
        return producto;
    }

    async update(id: number, dto: UpdateProductDto) {
        const producto = await this.prisma.product.update({ where: { id }, data: dto });
        if (dto.name !== undefined || dto.description !== undefined) {
            await this.actualizarEmbedding(producto.id, producto.name, producto.description);
        }
        return producto;
    }

    deactivate(id: number) {
        return this.prisma.product.update({ where: { id }, data: { active: false } });
    }

    private async actualizarEmbedding(id: number, name: string, description: string | null) {
        const embedding = await this.embeddingsService.generarEmbedding(`${name}: ${description ?? ''}`);
        const vectorSql = `[${embedding.join(',')}]`;
        await this.prisma.$executeRaw`UPDATE products SET embedding = ${vectorSql}::vector WHERE id = ${id}`;
    }
}
