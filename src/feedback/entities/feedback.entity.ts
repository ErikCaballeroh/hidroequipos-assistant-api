export class FeedbackEntity {
    id: number;
    messageId: number;
    userId: number;
    type: 'like' | 'dislike';
    comment: string | null;
    createdAt: Date;
}
