export type {
  LegalDocument,
  LegalSection,
  LegalDocumentId,
  LegalConsentRecord,
  LegalConsentStore,
} from './types';

export {
  LEGAL_DOCUMENTS,
  LEGAL_DOCUMENT_LIST,
  getLegalDocument,
  getLegalDocumentById,
} from './legalDocuments';

export {
  LEGAL_CONSENT_VERSION,
  LEGAL_DOCUMENT_VERSIONS,
  LEGAL_STORAGE_KEY,
} from './legalConfig';

export {
  legalConsentStore,
  isConsentValid,
  getOutdatedDocuments,
  recordConsent,
} from './LegalConsentStore';

export { LegalConsentModal } from './LegalConsentModal';
export { LegalGate } from './LegalGate';
