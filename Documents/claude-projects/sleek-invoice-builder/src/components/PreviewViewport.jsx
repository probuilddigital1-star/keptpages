import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Wraps a fixed-size content node and scales it to fit the available width on mobile.
 * Keeps natural size on large screens.
 */
export default function PreviewViewport({ children, baseWidth }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      // Leave a little padding so content doesn't touch edges
      const target = Math.min(1, (w - 16) / baseWidth);
      setScale(isFinite(target) && target > 0 ? target : 1);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [baseWidth]);

  // Prevent layout jumps on orientation change
  useEffect(() => {
    const onOrient = () => {
      const el = outerRef.current;
      if (!el) return;
      const w = el.clientWidth;
      const target = Math.min(1, (w - 16) / baseWidth);
      setScale(isFinite(target) && target > 0 ? target : 1);
    };
    window.addEventListener('orientationchange', onOrient);
    return () => window.removeEventListener('orientationchange', onOrient);
  }, [baseWidth]);

  return (
    <div ref={outerRef} className="w-full overflow-auto">
      <div
        ref={innerRef}
        className="origin-top-left"
        style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: baseWidth + 'px' }}
      >
        {children}
      </div>
    </div>
  );
}