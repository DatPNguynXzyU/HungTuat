import { BaseTranslations } from './translation.interface';
import { TranslationService } from './translation.service';

/**
 * Default fallback translations (English) for React email templates when mounted standalone.
 */
let defaultTranslationsInstance: BaseTranslations | null = null;

export function getDefaultTranslations(): BaseTranslations {
   if (!defaultTranslationsInstance) {
      const service = new TranslationService();
      defaultTranslationsInstance = service.getTranslations();
   }
   return defaultTranslationsInstance;
}
