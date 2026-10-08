import { Module } from '@nestjs/common';
import { EmbeddingsModule } from '../embeddings/embeddings.module.js';
import { KnowledgeBaseController } from './knowledge-base.controller.js';
import { KnowledgeBaseService } from './knowledge-base.service.js';

@Module({
    imports: [EmbeddingsModule],
    controllers: [KnowledgeBaseController],
    providers: [KnowledgeBaseService],
})
export class KnowledgeBaseModule { }
