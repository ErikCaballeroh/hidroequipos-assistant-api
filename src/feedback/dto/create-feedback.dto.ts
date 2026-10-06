import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateFeedbackDto {
    @IsIn(['like', 'dislike'])
    type: 'like' | 'dislike';

    @IsOptional()
    @IsString()
    comment?: string;
}
