import { Body, Controller, Delete, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { FeedbackService } from './feedback.service.js';
import { CreateFeedbackDto } from './dto/create-feedback.dto.js';
import { FeedbackEntity } from './entities/feedback.entity.js';

@ApiTags('feedback')
@ApiBearerAuth()
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
    constructor(private readonly feedbackService: FeedbackService) { }

    @Post(':id/feedback')
    @ApiOkResponse({ type: FeedbackEntity })
    upsert(@Param('id') id: string, @Body() dto: CreateFeedbackDto, @Req() req: any) {
        return this.feedbackService.upsert(+id, req.user.userId, dto.type, dto.comment);
    }

    @Delete(':id/feedback')
    remove(@Param('id') id: string, @Req() req: any) {
        return this.feedbackService.remove(+id, req.user.userId);
    }
}
