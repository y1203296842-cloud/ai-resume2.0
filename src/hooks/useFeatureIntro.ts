import { useState, useEffect, useCallback, useRef } from 'react';

const shownFeatures = new Set<string>();

export function useFeatureIntro(featureId: string) {
  const effectRan = useRef(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (effectRan.current) return;
    effectRan.current = true;

    if (!shownFeatures.has(featureId)) {
      shownFeatures.add(featureId);
      setOpen(true);
    }
  }, [featureId]);

  const close = useCallback(() => setOpen(false), []);

  return { open, close };
}
