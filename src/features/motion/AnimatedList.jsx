import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import useReducedMotion from './useReducedMotion';
import './AnimatedList.css';

const toKey = (value) => String(value ?? '');

export default function AnimatedList({
  items = [],
  getKey = (item) => item?.id,
  renderItem,
  className = '',
  itemClassName = '',
  disabled = false,
  promoteOnMove = true
}) {
  const containerRef = useRef(null);
  const keysRef = useRef([]);
  const itemRectsRef = useRef(new Map());
  const cleanupTimersRef = useRef(new Map());
  const flipTimersRef = useRef([]);
  const [promotedKeys, setPromotedKeys] = useState(() => new Set());
  const reducedMotion = useReducedMotion();
  const itemKeys = useMemo(() => items.map((item, index) => toKey(getKey(item, index))), [getKey, items]);
  const keySignature = itemKeys.join('|');
  const shouldAnimate = !disabled && !reducedMotion;

  useEffect(() => {
    const previousKeys = keysRef.current;
    const previousIndexes = new Map(previousKeys.map((key, index) => [key, index]));
    const nextPromotedKeys = new Set();

    itemKeys.forEach((key, index) => {
      if (
        shouldAnimate &&
        promoteOnMove &&
        previousKeys.length > 0 &&
        previousIndexes.has(key) &&
        previousIndexes.get(key) > index
      ) {
        nextPromotedKeys.add(key);
      }
    });

    if (shouldAnimate && nextPromotedKeys.size > 0) {
      setPromotedKeys((currentKeys) => new Set([...currentKeys, ...nextPromotedKeys]));

      nextPromotedKeys.forEach((key) => {
        window.clearTimeout(cleanupTimersRef.current.get(key));
        cleanupTimersRef.current.set(key, window.setTimeout(() => {
          setPromotedKeys((currentKeys) => {
            const nextKeys = new Set(currentKeys);
            nextKeys.delete(key);
            return nextKeys;
          });
          cleanupTimersRef.current.delete(key);
        }, 1250));
      });
    }

    keysRef.current = itemKeys;

    return undefined;
  }, [itemKeys, keySignature, promoteOnMove, shouldAnimate]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const nodes = [...container.querySelectorAll('[data-animated-key]')];
    const nextRects = new Map(nodes.map((node) => [
      node.getAttribute('data-animated-key'),
      node.getBoundingClientRect()
    ]));

    flipTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    flipTimersRef.current = [];

    if (!shouldAnimate || nodes.length > 40) {
      itemRectsRef.current = nextRects;
      nodes.forEach((node) => {
        node.style.transition = '';
        node.style.transform = '';
        node.style.willChange = '';
      });
      return undefined;
    }

    const previousRects = itemRectsRef.current;
    nodes.forEach((node) => {
      const key = node.getAttribute('data-animated-key');
      const previousRect = previousRects.get(key);
      const nextRect = nextRects.get(key);
      if (!previousRect || !nextRect) return;

      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;

      node.style.transition = 'none';
      node.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
      node.style.willChange = 'transform';

      window.requestAnimationFrame(() => {
        node.style.transition = 'transform 280ms cubic-bezier(0.2, 0.8, 0.18, 1)';
        node.style.transform = 'translate3d(0, 0, 0)';
      });

      const cleanupTimer = window.setTimeout(() => {
        node.style.transition = '';
        node.style.transform = '';
        node.style.willChange = '';
      }, 320);
      flipTimersRef.current.push(cleanupTimer);
    });

    itemRectsRef.current = nextRects;
    return undefined;
  }, [itemKeys, keySignature, shouldAnimate]);

  useEffect(() => () => {
    cleanupTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    cleanupTimersRef.current.clear();
    flipTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    flipTimersRef.current = [];
  }, []);

  return (
    <div className={`animated-list ${className}`.trim()} ref={containerRef}>
      {items.map((item, index) => {
        const key = itemKeys[index];
        const isPromoted = promotedKeys.has(key);

        return (
          <div
            key={key}
            className={`animated-list__item ${itemClassName}`.trim()}
            data-animated-key={key}
          >
            {renderItem(item, { index, isPromoted })}
          </div>
        );
      })}
    </div>
  );
}
