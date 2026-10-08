export class MessageListItemEntity {
    id: number;
    createdAt: Date;
    question: string | null;
    answerPreview: string;
    feedback: 'like' | 'dislike' | null;
    bestMatchDistance: number | null;
}

export class MessagePageEntity {
    items: MessageListItemEntity[];
    page: number;
    pageSize: number;
    total: number;
}
