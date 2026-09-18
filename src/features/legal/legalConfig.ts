import type { LegalDocumentId } from './types';

export const LEGAL_CONSENT_VERSION = '1.0';

export const LEGAL_DOCUMENT_VERSIONS: Record<LegalDocumentId, string> = {
  'user-service': '1.0',
  'privacy-policy': '1.0',
  'disclaimer': '1.0',
};

export const LEGAL_STORAGE_KEY = 'ganlin_legal_consent';
