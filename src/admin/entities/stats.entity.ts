export class TopProductEntity {
    productId: number;
    sku: string | null;
    name: string;
    count: number;
}

export class FeedbackStatsEntity {
    likes: number;
    dislikes: number;
    total: number;
    approvalRate: number | null;
}

export class NoMatchRecentItemEntity {
    messageId: number;
    question: string | null;
    createdAt: Date;
}

export class NoMatchStatsEntity {
    count: number;
    recent: NoMatchRecentItemEntity[];
}

export class StatsEntity {
    topProducts: TopProductEntity[];
    feedback: FeedbackStatsEntity;
    noMatch: NoMatchStatsEntity;
}
