import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { UsersService } from './users.service.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('supervisor')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    findAll() {
        return this.usersService.findAll();
    }

    @Post()
    create(@Body() dto: { name: string; email: string; password: string; role: 'employee' | 'supervisor' }) {
        return this.usersService.create(dto);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: { role?: string; active?: boolean }) {
        return this.usersService.update(+id, dto);
    }

    @Post(':id/reset-password')
    resetPassword(@Param('id') id: string) {
        return this.usersService.resetPassword(+id);
    }

    @Delete(':id')
    deactivate(@Param('id') id: string) {
        return this.usersService.deactivate(+id);
    }
}