import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { HealthModule } from './health/health.module.js';
import { EmbeddingsModule } from './embeddings/embeddings.module.js';
import { GeminiModule } from './gemini/gemini.module.js';
import { RetrievalModule } from './retrieval/retrieval.module.js';
import { PromptBuilderModule } from './prompt-builder/prompt-builder.module.js';
import { ConversationsModule } from './conversations/conversations.module.js';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, HealthModule, EmbeddingsModule, GeminiModule, RetrievalModule, PromptBuilderModule, ConversationsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
