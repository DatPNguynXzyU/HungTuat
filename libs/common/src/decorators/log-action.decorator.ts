import { SetMetadata } from '@nestjs/common';
import { LOG_ACTION_KEY } from '@common/logger/logger.constants';

export const LogAction = (action: string) => SetMetadata(LOG_ACTION_KEY, action);
