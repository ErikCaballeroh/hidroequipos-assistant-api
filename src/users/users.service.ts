import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { FindUsersQueryDto } from './dto/find-users-query.dto.js';

@Injectable()
export class UsersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly authService: AuthService,
    ) { }

    async findAll(query: FindUsersQueryDto) {
        const where = query.search
            ? {
                OR: [
                    { name: { contains: query.search, mode: 'insensitive' as const } },
                    { email: { contains: query.search, mode: 'insensitive' as const } },
                ],
            }
            : undefined;

        const [items, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                select: { id: true, name: true, email: true, role: true, active: true },
                orderBy: { id: 'asc' },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
            }),
            this.prisma.user.count({ where }),
        ]);

        return { items, page: query.page, pageSize: query.pageSize, total };
    }

    async create(dto: CreateUserDto) {
        const passwordHash = await bcrypt.hash(dto.password, 10);
        return this.prisma.user.create({
            data: { name: dto.name, email: dto.email, passwordHash, role: dto.role },
        });
    }

    update(id: number, dto: UpdateUserDto) {
        return this.prisma.user.update({ where: { id }, data: dto as any });
    }

    resetPassword(id: number) {
        return this.authService.resetearPasswordPorSupervisor(id);
    }

    deactivate(id: number) {
        return this.prisma.user.update({ where: { id }, data: { active: false } });
    }
}