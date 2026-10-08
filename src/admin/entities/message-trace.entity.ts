export class MessageTraceMessageEntity {
    id: number;
    content: string;
    createdAt: Date;
    responseTimeMs: number | null;
    bestMatchDistance: number | null;
}

export class MessageTraceFeedbackEntity {
    type: 'like' | 'dislike';
    comment: string | null;
}

export class MessageTraceProductEntity {
    id: number;
    sku: string | null;
    name: string;
    distance: number;
    similarity: number;
}

export class MessageTraceKnowledgeEntity {
    id: number;
    title: string;
    distance: number;
    similarity: number;
}

export class MessageTraceEntity {
    message: MessageTraceMessageEntity;
    question: string | null;
    feedback: MessageTraceFeedbackEntity | null;
    products: MessageTraceProductEntity[];
    knowledge: MessageTraceKnowledgeEntity[];
}
