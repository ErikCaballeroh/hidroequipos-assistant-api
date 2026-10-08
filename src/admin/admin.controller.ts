import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { AdminService } from './admin.service.js';
import { StatsQueryDto } from './dto/stats-query.dto.js';
import { GeminiLogsQueryDto } from './dto/gemini-logs-query.dto.js';
import { MessagesQueryDto } from './dto/messages-query.dto.js';
import { StatsEntity } from './entities/stats.entity.js';
import { GeminiLogPageEntity } from './entities/gemini-log-page.entity.js';
import { MessagePageEntity } from './entities/message-page.entity.js';
import { MessageTraceEntity } from './entities/message-trace.entity.js';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('supervisor')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('stats')
    @ApiOkResponse({ type: StatsEntity })
    getStats(@Query() query: StatsQueryDto) {
        return this.adminService.getStats(query);
    }

    @Get('gemini-logs')
    @ApiOkResponse({ type: GeminiLogPageEntity })
    getGeminiLogs(@Query() query: GeminiLogsQueryDto) {
        return this.adminService.getGeminiLogs(query);
    }

    @Get('messages')
    @ApiOkResponse({ type: MessagePageEntity })
    getMessages(@Query() query: MessagesQueryDto) {
        return this.adminService.getMessages(query);
    }

    @Get('messages/:id/trace')
    @ApiOkResponse({ type: MessageTraceEntity })
    getMessageTrace(@Param('id') id: string) {
        return this.adminService.getMessageTrace(+id);
    }
}
