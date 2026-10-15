import type { AppendUserEventDto, UserStoredEvent } from '@user/cqrs/write/user-event.interface';

export interface IUserEventStore {
   appendEvent<T = Record<string, unknown>>(params: AppendUserEventDto<T>): Promise<UserStoredEvent<T>>;
   getStream(streamId: string, fromVersion?: number): Promise<UserStoredEvent[]>;
   getAllEvents(options?: { fromVersion?: number; take?: number; skip?: number }): Promise<UserStoredEvent[]>;
   countEvents(streamId?: string): Promise<number>;
}
