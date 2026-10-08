import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { QueryTemplatesService } from './query-templates.service.js';
import { QueryTemplateEntity } from './entities/query-template.entity.js';
import { CreateQueryTemplateDto } from './dto/create-query-template.dto.js';
import { UpdateQueryTemplateDto } from './dto/update-query-template.dto.js';

@ApiTags('query-templates')
@ApiBearerAuth()
@Controller('query-templates')
@UseGuards(JwtAuthGuard)
export class QueryTemplatesController {
    constructor(private readonly queryTemplatesService: QueryTemplatesService) { }

    @Get()
    @ApiOkResponse({ type: QueryTemplateEntity, isArray: true })
    findAll() {
        return this.queryTemplatesService.listarActivas();
    }

    @Post()
    @UseGuards(RolesGuard)
    @Roles('supervisor')
    @ApiOkResponse({ type: QueryTemplateEntity })
    create(@Body() dto: CreateQueryTemplateDto) {
        return this.queryTemplatesService.create(dto);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles('supervisor')
    @ApiOkResponse({ type: QueryTemplateEntity })
    update(@Param('id') id: string, @Body() dto: UpdateQueryTemplateDto) {
        return this.queryTemplatesService.update(+id, dto);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles('supervisor')
    remove(@Param('id') id: string) {
        return this.queryTemplatesService.remove(+id);
    }
}
