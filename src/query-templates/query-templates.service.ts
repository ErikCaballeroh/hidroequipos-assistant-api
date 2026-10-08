import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateQueryTemplateDto } from './dto/create-query-template.dto.js';
import { UpdateQueryTemplateDto } from './dto/update-query-template.dto.js';

@Injectable()
export class QueryTemplatesService {
    constructor(private readonly prisma: PrismaService) { }

    listarActivas() {
        return this.prisma.queryTemplate.findMany({
            where: { active: true },
            orderBy: { displayOrder: 'asc' },
        });
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
