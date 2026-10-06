import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    async login(email: string, password: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !user.active) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        const passwordValida = await bcrypt.compare(password, user.passwordHash);
        if (!passwordValida) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        const payload = { sub: user.id, role: user.role };
        return {
            accessToken: this.jwtService.sign(payload),
            mustChangePassword: user.mustChangePassword,
        };
    }

    async obtenerPerfil(userId: number) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, role: true },
        });
        if (!user) {
            throw new UnauthorizedException('Usuario no encontrado');
        }
        return user;
    }

    async cambiarPassword(userId: number, passwordActual: string, nuevaPassword: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new UnauthorizedException('Usuario no encontrado');
        }

        const passwordActualValida = await bcrypt.compare(passwordActual, user.passwordHash);
        if (!passwordActualValida) {
            throw new UnauthorizedException('Contraseña actual incorrecta');
        }

        const passwordHash = await bcrypt.hash(nuevaPassword, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash, mustChangePassword: false },
        });
    }

    // Llamado desde UsersController, solo accesible con guard de rol 'supervisor'
    async resetearPasswordPorSupervisor(userId: number): Promise<string> {
        const passwordTemporal = this.generarPasswordTemporal();
        const passwordHash = await bcrypt.hash(passwordTemporal, 10);

        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash, mustChangePassword: true },
        });

        // Se devuelve en texto plano SOLO en esta respuesta, para que el supervisor
        // se la comunique al empleado directamente (en persona, chat interno, etc.)
        // Nunca se guarda en texto plano ni se registra en logs.
        return passwordTemporal;
    }

    private generarPasswordTemporal(): string {
        return Math.random().toString(36).slice(-10);
    }
}
