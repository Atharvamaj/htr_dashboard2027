import { useState, useEffect, useMemo } from 'react';

interface VirtualizedListOptions {
  itemHeight: number;
  containerHeight: number;
  items: any[];
  overscan?: number;
}

export const useVirtualizedList = ({
  itemHeight,
  containerHeight,
  items,
  overscan = 5,
}: VirtualizedListOptions) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    items.length - 1
  );

  const paddingTop = Math.max(0, (visibleStart - overscan) * itemHeight);
  const paddingBottom = Math.max(
    0,
    (items.length - visibleEnd - 1 - overscan) * itemHeight
  );

  const visibleItems = useMemo(
    () =>
      items.slice(
        Math.max(0, visibleStart - overscan),
        Math.min(items.length, visibleEnd + 1 + overscan)
      ),
    [items, visibleStart, visibleEnd, overscan]
  );

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return {
    visibleItems,
    paddingTop,
    paddingBottom,
    handleScroll,
    totalHeight: items.length * itemHeight,
  };
};