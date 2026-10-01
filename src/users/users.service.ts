import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';

@Injectable()
export class UsersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly authService: AuthService,
    ) { }

    findAll() {
        return this.prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, active: true } });
    }

    async create(dto: { name: string; email: string; password: string; role: 'employee' | 'supervisor' }) {
        const passwordHash = await bcrypt.hash(dto.password, 10);
        return this.prisma.user.create({
            data: { name: dto.name, email: dto.email, passwordHash, role: dto.role },
        });
    }

    update(id: number, dto: { role?: string; active?: boolean }) {
        return this.prisma.user.update({ where: { id }, data: dto as any });
    }

    resetPassword(id: number) {
        return this.authService.resetearPasswordPorSupervisor(id);
    }

    deactivate(id: number) {
        return this.prisma.user.update({ where: { id }, data: { active: false } });
    }
}