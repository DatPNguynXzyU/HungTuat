import { Command } from '@common';
import type { IJwksResponse } from '@contracts/auth';

export class GetJwksCommand extends Command<IJwksResponse> {}
