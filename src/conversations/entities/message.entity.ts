import { FeedbackEntity } from '../../feedback/entities/feedback.entity.js';

export class MessageEntity {
    id: number;
    conversationId: number;
    role: 'user' | 'assistant';
    content: string;
    bestMatchDistance: number | null;
    responseTimeMs: number | null;
    createdAt: Date;
    feedback?: FeedbackEntity | null;
}
