import { useEffect, useState } from 'react';

const DESKTOP_EXPERIENCE_QUERY = '(min-width: 768px)';

const matchesDesktopExperience = () => (
  typeof window !== 'undefined' && window.matchMedia(DESKTOP_EXPERIENCE_QUERY).matches
);

export function useDesktopExperience() {
  const [isDesktopExperience, setIsDesktopExperience] = useState(matchesDesktopExperience);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia(DESKTOP_EXPERIENCE_QUERY);
    const handleChange = () => setIsDesktopExperience(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isDesktopExperience;
}
