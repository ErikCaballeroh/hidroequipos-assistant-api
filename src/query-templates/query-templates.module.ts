import { Module } from '@nestjs/common';
import { QueryTemplatesController } from './query-templates.controller.js';
import { QueryTemplatesService } from './query-templates.service.js';

@Module({
    controllers: [QueryTemplatesController],
    providers: [QueryTemplatesService],
})
export class QueryTemplatesModule { }
