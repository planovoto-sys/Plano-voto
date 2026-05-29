import { useEffect, useRef, useState } from 'react';
import { getRouteRank } from './motionTokens';
import useReducedMotion from './useReducedMotion';
import './PageTransition.css';

const getDirection = ({ pathname, previousPathname, navigationType }) => {
  if (!previousPathname || previousPathname === pathname) return 'fade';
  if (navigationType === 'POP') return 'back';

  const previousRank = getRouteRank(previousPathname);
  const nextRank = getRouteRank(pathname);

  if (previousRank < 0 || nextRank < 0 || previousRank === nextRank) return 'fade';
  return nextRank > previousRank ? 'forward' : 'back';
};

export default function PageTransition({ children, locationKey, pathname, navigationType }) {
  const previousPathnameRef = useRef('');
  const reducedMotion = useReducedMotion();
  const [transition, setTransition] = useState({
    key: locationKey,
    direction: reducedMotion ? 'reduced' : 'fade'
  });

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    const direction = reducedMotion
      ? 'reduced'
      : getDirection({
          pathname,
          previousPathname,
          navigationType
        });

    previousPathnameRef.current = pathname;
    setTransition({ key: locationKey, direction });

    const scrollTarget = document.querySelector('.prototype-scroll, .my-plan-scroll, .app-main');
    if (scrollTarget) {
      scrollTarget.scrollTop = 0;
    }
  }, [locationKey, navigationType, pathname, reducedMotion]);

  return (
    <div
      key={transition.key}
      className={`page-transition page-transition--${transition.direction}`}
      data-route={pathname}
    >
      {children}
    </div>
  );
}
