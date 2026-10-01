import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ConversationsService } from './conversations.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
    constructor(private readonly conversationsService: ConversationsService) { }

    @Post()
    create(@Req() req: any) {
        return this.conversationsService.crear(req.user.userId);
    }

    @Get()
    findAll(@Req() req: any) {
        return this.conversationsService.listarPorUsuario(req.user.userId);
    }

    @Post(':id/messages')
    sendMessage(@Param('id') id: string, @Body() dto: SendMessageDto) {
        return this.conversationsService.procesarMensaje(+id, dto.content);
    }

    @Get(':id/messages')
    getMessages(@Param('id') id: string) {
        return this.conversationsService.listarMensajes(+id);
    }
}
