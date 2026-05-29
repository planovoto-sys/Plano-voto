import { useEffect, useMemo, useRef, useState } from 'react';
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
  const keysRef = useRef([]);
  const cleanupTimersRef = useRef(new Map());
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

  useEffect(() => () => {
    cleanupTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    cleanupTimersRef.current.clear();
  }, []);

  return (
    <div className={`animated-list ${className}`.trim()}>
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
