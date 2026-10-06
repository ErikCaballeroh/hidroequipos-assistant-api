import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { QueryTemplatesService } from './query-templates.service.js';
import { QueryTemplateEntity } from './entities/query-template.entity.js';

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
}
