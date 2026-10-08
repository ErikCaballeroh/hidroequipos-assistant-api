export class GeminiLogEntity {
    id: number;
    createdAt: Date;
    success: boolean;
    errorCode: string | null;
    responseTimeMs: number | null;
}

export class GeminiLogPageEntity {
    items: GeminiLogEntity[];
    page: number;
    pageSize: number;
    total: number;
}
