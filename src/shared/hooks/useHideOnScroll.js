import { useEffect, useRef, useState } from 'react';

export function useHideOnScroll(scrollRef) {
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentY = el.scrollTop;
          if (el.scrollHeight - el.clientHeight - currentY <= 50) {
            lastScrollYRef.current = currentY;
            ticking = false;
            return;
          }
          if (currentY > 50 && currentY > lastScrollYRef.current + 10) {
            setHeaderVisible(false);
          } else if (currentY < lastScrollYRef.current - 10) {
            setHeaderVisible(true);
          }
          lastScrollYRef.current = currentY;
          ticking = false;
        });
        ticking = true;
      }
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [scrollRef]);

  return headerVisible;
}
