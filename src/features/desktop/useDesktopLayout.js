import { useEffect, useState } from 'react';

export const DESKTOP_REDESIGN_QUERY = '(min-width: 1024px) and (min-height: 640px)';

const matchesDesktopLayout = () => (
  typeof window !== 'undefined' && window.matchMedia(DESKTOP_REDESIGN_QUERY).matches
);

export function useDesktopLayout() {
  const [isDesktopLayout, setIsDesktopLayout] = useState(matchesDesktopLayout);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia(DESKTOP_REDESIGN_QUERY);
    const handleChange = () => setIsDesktopLayout(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isDesktopLayout;
}
