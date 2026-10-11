import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { FindUsersQueryDto } from './dto/find-users-query.dto.js';
import { UserPageEntity } from './dto/user-page.entity.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('supervisor')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    @ApiOkResponse({ type: UserPageEntity })
    findAll(@Query() query: FindUsersQueryDto) {
        return this.usersService.findAll(query);
    }

    @Post()
    create(@Body() dto: CreateUserDto) {
        return this.usersService.create(dto);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
        return this.usersService.update(+id, dto);
    }

    @Post(':id/reset-password')
    @ApiOkResponse({ type: String, description: 'Contraseña temporal en texto plano, devuelta una sola vez' })
    resetPassword(@Param('id') id: string) {
        return this.usersService.resetPassword(+id);
    }

    @Delete(':id')
    deactivate(@Param('id') id: string) {
        return this.usersService.deactivate(+id);
    }
}