import { Module } from '@nestjs/common';
import { GeminiModule } from '../gemini/gemini.module.js';
import { RetrievalModule } from '../retrieval/retrieval.module.js';
import { PromptBuilderModule } from '../prompt-builder/prompt-builder.module.js';
import { ConversationsController } from './conversations.controller.js';
import { ConversationsService } from './conversations.service.js';

@Module({
  imports: [GeminiModule, RetrievalModule, PromptBuilderModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
})
export class ConversationsModule {}
