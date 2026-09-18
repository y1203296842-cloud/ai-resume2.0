import type { LegalConsentRecord, LegalConsentStore } from './types';
import { LEGAL_STORAGE_KEY, LEGAL_CONSENT_VERSION, LEGAL_DOCUMENT_VERSIONS } from './legalConfig';
import type { LegalDocumentId } from './types';

class BrowserLegalConsentStore implements LegalConsentStore {
  getConsent(): LegalConsentRecord | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(LEGAL_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LegalConsentRecord;
      if (!parsed || typeof parsed.consented !== 'boolean') return null;
      return parsed;
    } catch {
      return null;
    }
  }

  saveConsent(record: LegalConsentRecord): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LEGAL_STORAGE_KEY, JSON.stringify(record));
    } catch {
      // localStorage may be unavailable (private browsing, quota exceeded, etc.)
      // Silently fail — consent is a UX gate, not a security boundary
    }
  }

  clearConsent(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(LEGAL_STORAGE_KEY);
    } catch {
      // Same as above
    }
  }
}

export const legalConsentStore: LegalConsentStore = new BrowserLegalConsentStore();

export function isConsentValid(): boolean {
  const record = legalConsentStore.getConsent();
  if (!record || !record.consented) return false;
  if (record.consentVersion !== LEGAL_CONSENT_VERSION) return false;
  for (const id of Object.keys(LEGAL_DOCUMENT_VERSIONS) as LegalDocumentId[]) {
    const acceptedVersion = record.documents?.[id];
    const currentVersion = LEGAL_DOCUMENT_VERSIONS[id];
    if (acceptedVersion !== currentVersion) return false;
  }
  return true;
}

export function getOutdatedDocuments(): LegalDocumentId[] {
  const record = legalConsentStore.getConsent();
  if (!record) {
    return Object.keys(LEGAL_DOCUMENT_VERSIONS) as LegalDocumentId[];
  }
  const outdated: LegalDocumentId[] = [];
  for (const id of Object.keys(LEGAL_DOCUMENT_VERSIONS) as LegalDocumentId[]) {
    const acceptedVersion = record.documents?.[id];
    const currentVersion = LEGAL_DOCUMENT_VERSIONS[id];
    if (acceptedVersion !== currentVersion) {
      outdated.push(id);
    }
  }
  return outdated;
}

export function recordConsent(): void {
  const record: LegalConsentRecord = {
    consented: true,
    consentVersion: LEGAL_CONSENT_VERSION,
    consentedAt: new Date().toISOString(),
    documents: { ...LEGAL_DOCUMENT_VERSIONS },
  };
  legalConsentStore.saveConsent(record);
}
