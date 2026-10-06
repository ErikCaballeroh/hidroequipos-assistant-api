import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class QueryTemplatesService {
    constructor(private readonly prisma: PrismaService) { }

    listarActivas() {
        return this.prisma.queryTemplate.findMany({
            where: { active: true },
            orderBy: { displayOrder: 'asc' },
        });
    }
}
