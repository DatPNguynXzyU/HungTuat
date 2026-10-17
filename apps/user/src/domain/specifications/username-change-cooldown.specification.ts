import { Injectable } from '@nestjs/common';
import { Specification } from '@common';
import { USER_ERROR_CODES } from '@contracts/user';

export const USERNAME_COOLDOWN_CONFIG = {
   COOLDOWN_DAYS: 30,
   COOLDOWN_MS: 30 * 24 * 60 * 60 * 1000,
} as const;

export interface IUsernameCooldownCandidate {
   currentUsername?: string | null;
   newUsername?: string | null;
   lastUsernameChangedAt?: Date | null;
   isActorAdmin?: boolean;
}

export interface IUsernameCooldownDetails {
   daysRemaining: number;
   hoursRemaining: number;
   nextAvailableDate: Date;
}

/**
 * Domain specification verifying whether a user is eligible to change their username
 * according to the 30-day cooldown policy.
 */
@Injectable()
export class UsernameChangeCooldownSpecification extends Specification<IUsernameCooldownCandidate> {
   protected readonly errorCode = USER_ERROR_CODES.USERNAME_CHANGE_COOLDOWN;

   isSatisfiedBy(candidate: IUsernameCooldownCandidate): boolean {
      if (!candidate) {
         return true;
      }

      // Administrative roles bypass cooldown constraints
      if (candidate.isActorAdmin) {
         return true;
      }

      // If no new username is supplied, cooldown is not violated
      if (!candidate.newUsername) {
         return true;
      }

      // If user is keeping the exact same username, cooldown is not triggered
      const normalizedNew = candidate.newUsername.toLowerCase().trim();
      const normalizedCurrent = candidate.currentUsername?.toLowerCase().trim();
      if (normalizedCurrent && normalizedCurrent === normalizedNew) {
         return true;
      }

      // If user has never changed username before, cooldown is satisfied
      if (!candidate.lastUsernameChangedAt) {
         return true;
      }

      const lastChangeTime = new Date(candidate.lastUsernameChangedAt).getTime();
      const timeElapsed = Date.now() - lastChangeTime;

      return timeElapsed >= USERNAME_COOLDOWN_CONFIG.COOLDOWN_MS;
   }

   /**
    * Calculates remaining cooldown time and next permitted modification timestamp.
    */
   getCooldownDetails(lastUsernameChangedAt: Date): IUsernameCooldownDetails {
      const lastChangeTime = new Date(lastUsernameChangedAt).getTime();
      const nextAvailableDate = new Date(lastChangeTime + USERNAME_COOLDOWN_CONFIG.COOLDOWN_MS);
      const msRemaining = Math.max(0, nextAvailableDate.getTime() - Date.now());
      const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
      const hoursRemaining = Math.ceil(msRemaining / (60 * 60 * 1000));

      return {
         daysRemaining,
         hoursRemaining,
         nextAvailableDate,
      };
   }
}
