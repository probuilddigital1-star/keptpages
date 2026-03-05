import { renderHook, act } from '@testing-library/react';
import { useMediaQuery, useIsMobile, useIsDesktop } from './useMediaQuery';

describe('useMediaQuery', () => {
  let listeners;

  beforeEach(() => {
    listeners = {};

    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn((event, handler) => {
        listeners[query] = handler;
      }),
      removeEventListener: vi.fn((event, handler) => {
        if (listeners[query] === handler) {
          delete listeners[query];
        }
      }),
      dispatchEvent: vi.fn(),
    }));
  });

  it('returns false initially when query does not match', () => {
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(false);
  });

  it('returns true when query matches', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn((event, handler) => {
        listeners[query] = handler;
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(true);
  });

  it('updates when media query changes', () => {
    const query = '(max-width: 767px)';
    const { result } = renderHook(() => useMediaQuery(query));

    expect(result.current).toBe(false);

    // Simulate a media query change
    act(() => {
      if (listeners[query]) {
        listeners[query]({ matches: true });
      }
    });

    expect(result.current).toBe(true);
  });

  it('cleans up event listener on unmount', () => {
    const removeEventListener = vi.fn();
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn((event, handler) => {
        listeners[query] = handler;
      }),
      removeEventListener,
      dispatchEvent: vi.fn(),
    }));

    const { unmount } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    unmount();

    expect(removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
  });
});

describe('useIsMobile', () => {
  it('returns false when viewport is wide', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns true when viewport is narrow', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(max-width: 767px)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });
});

describe('useIsDesktop', () => {
  it('returns false when viewport is narrow', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
  });

  it('returns true when viewport is wide', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(min-width: 1024px)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);
  });
});
