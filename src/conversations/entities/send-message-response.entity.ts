import { MessageEntity } from './message.entity.js';
import { SourcesEntity } from './sources.entity.js';

export class SendMessageResponseEntity {
    message: MessageEntity;
    sources: SourcesEntity;
}
