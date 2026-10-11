import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateQueryTemplateDto } from './dto/create-query-template.dto.js';
import { UpdateQueryTemplateDto } from './dto/update-query-template.dto.js';
import { FindQueryTemplatesQueryDto } from './dto/find-query-templates-query.dto.js';

@Injectable()
export class QueryTemplatesService {
    constructor(private readonly prisma: PrismaService) { }

    async listarActivas(query: FindQueryTemplatesQueryDto) {
        const where = query.search
            ? {
                active: true,
                OR: [
                    { title: { contains: query.search, mode: 'insensitive' as const } },
                    { queryText: { contains: query.search, mode: 'insensitive' as const } },
                ],
            }
            : { active: true };

        const [items, total] = await Promise.all([
            this.prisma.queryTemplate.findMany({
                where,
                orderBy: { displayOrder: 'asc' },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
            }),
            this.prisma.queryTemplate.count({ where }),
        ]);

        return { items, page: query.page, pageSize: query.pageSize, total };
    }

    create(dto: CreateQueryTemplateDto) {
        return this.prisma.queryTemplate.create({ data: dto });
    }

    update(id: number, dto: UpdateQueryTemplateDto) {
        return this.prisma.queryTemplate.update({ where: { id }, data: dto });
    }

    remove(id: number) {
        return this.prisma.queryTemplate.delete({ where: { id } });
    }
}
