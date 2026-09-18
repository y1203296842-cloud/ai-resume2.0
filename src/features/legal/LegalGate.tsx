'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { isConsentValid } from './LegalConsentStore';
import { LegalConsentModal } from './LegalConsentModal';

interface LegalGateProps {
  children: ReactNode;
  feature?: string;
}

export function LegalGate({ children, feature }: LegalGateProps) {
  const [showModal, setShowModal] = useState(false);
  const [consented, setConsented] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isConsentValid()) {
      setShowModal(true);
    } else {
      setConsented(true);
    }
  }, []);

  if (!mounted) {
    return null;
  }

  if (!consented) {
    return (
      <>
        <LegalConsentModal
          open={showModal}
          onConsented={() => {
            setConsented(true);
            setShowModal(false);
          }}
          onCancel={() => {
            setShowModal(false);
            if (typeof window !== 'undefined') {
              window.history.back();
            }
          }}
        />
        <div className="hidden" data-legal-gate-feature={feature}>
          {children}
        </div>
      </>
    );
  }

  return <>{children}</>;
}
