import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { KnowledgeBaseService } from './knowledge-base.service.js';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto.js';
import { UpdateKnowledgeBaseDto } from './dto/update-knowledge-base.dto.js';
import { KnowledgeBaseEntity } from './entities/knowledge-base.entity.js';

@ApiTags('knowledge-base')
@ApiBearerAuth()
@Controller('knowledge-base')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('supervisor')
export class KnowledgeBaseController {
    constructor(private readonly knowledgeBaseService: KnowledgeBaseService) { }

    @Get()
    @ApiOkResponse({ type: KnowledgeBaseEntity, isArray: true })
    findAll() {
        return this.knowledgeBaseService.findAll();
    }

    @Post()
    @ApiOkResponse({ type: KnowledgeBaseEntity })
    create(@Body() dto: CreateKnowledgeBaseDto) {
        return this.knowledgeBaseService.create(dto);
    }

    @Patch(':id')
    @ApiOkResponse({ type: KnowledgeBaseEntity })
    update(@Param('id') id: string, @Body() dto: UpdateKnowledgeBaseDto) {
        return this.knowledgeBaseService.update(+id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.knowledgeBaseService.remove(+id);
    }
}
