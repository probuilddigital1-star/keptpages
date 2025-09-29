/**
 * Device detection utilities for determining mobile/desktop capabilities
 */

/**
 * Detects if the current device is a mobile device
 * Checks touch capability, screen size, and user agent
 */
export const isMobileDevice = () => {
  // Return false if not in browser environment
  if (typeof window === 'undefined') return false;

  // Check for touch capability
  const hasTouchScreen = 'ontouchstart' in window ||
                        navigator.maxTouchPoints > 0 ||
                        navigator.msMaxTouchPoints > 0;

  // Check screen width (consider tablets as mobile for this purpose)
  const isMobileWidth = window.innerWidth <= 768;

  // Check user agent for mobile devices
  const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
                            .test(navigator.userAgent);

  // Consider it mobile if it has touch AND (small screen OR mobile UA)
  return hasTouchScreen && (isMobileWidth || isMobileUserAgent);
};

/**
 * Detects if the device likely has a physical keyboard
 * Uses hover capability as a proxy for desktop/laptop devices
 */
export const hasKeyboard = () => {
  // Return false if not in browser environment
  if (typeof window === 'undefined') return false;

  // Check if device supports hover (usually means mouse/trackpad)
  // This is a good indicator of desktop/laptop with keyboard
  const hasHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;

  // Check if not mobile and has hover capability
  return !isMobileDevice() && hasHover;
};

/**
 * Detects if we should show keyboard shortcuts
 * Only show on devices that can actually use them
 */
export const shouldShowKeyboardShortcuts = () => {
  return hasKeyboard();
};