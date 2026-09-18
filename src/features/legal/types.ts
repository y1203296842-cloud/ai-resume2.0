export interface LegalSection {
  heading?: string;
  paragraphs: string[];
}

export interface LegalDocument {
  id: LegalDocumentId;
  title: string;
  shortTitle: string;
  version: string;
  effectiveDate: string;
  updatedDate: string;
  slug: string;
  intro: string;
  sections: LegalSection[];
}

export type LegalDocumentId = 'user-service' | 'privacy-policy' | 'disclaimer';

export interface LegalConsentRecord {
  consented: boolean;
  consentVersion: string;
  consentedAt: string;
  documents: Record<LegalDocumentId, string>;
}

export interface LegalConsentStore {
  getConsent(): LegalConsentRecord | null;
  saveConsent(record: LegalConsentRecord): void;
  clearConsent(): void;
}
