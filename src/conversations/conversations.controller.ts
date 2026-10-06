import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ConversationsService } from './conversations.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { ConversationEntity } from './entities/conversation.entity.js';
import { MessageEntity } from './entities/message.entity.js';

@ApiTags('conversations')
@ApiBearerAuth()
@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
    constructor(private readonly conversationsService: ConversationsService) { }

    @Post()
    @ApiOkResponse({ type: ConversationEntity })
    create(@Req() req: any) {
        return this.conversationsService.crear(req.user.userId);
    }

    @Get()
    @ApiOkResponse({ type: ConversationEntity, isArray: true })
    findAll(@Req() req: any) {
        return this.conversationsService.listarPorUsuario(req.user.userId);
    }

    @Post(':id/messages')
    @ApiOkResponse({ type: MessageEntity })
    sendMessage(@Param('id') id: string, @Body() dto: SendMessageDto) {
        return this.conversationsService.procesarMensaje(+id, dto.content);
    }

    @Get(':id/messages')
    @ApiOkResponse({ type: MessageEntity, isArray: true })
    getMessages(@Param('id') id: string) {
        return this.conversationsService.listarMensajes(+id);
    }
}
