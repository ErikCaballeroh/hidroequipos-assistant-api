import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheckService, HealthCheck, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private prismaIndicator: PrismaHealthIndicator,
        private prisma: PrismaService,
    ) { }

    @Get()
    @HealthCheck()
    check() {
        return this.health.check([() => this.prismaIndicator.pingCheck('database', this.prisma)]);
    }
}