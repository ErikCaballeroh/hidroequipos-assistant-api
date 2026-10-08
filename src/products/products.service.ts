import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmbeddingsService } from '../embeddings/embeddings.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

@Injectable()
export class ProductsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly embeddingsService: EmbeddingsService,
    ) { }

    findAll() {
        return this.prisma.product.findMany({ orderBy: { id: 'asc' } });
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
