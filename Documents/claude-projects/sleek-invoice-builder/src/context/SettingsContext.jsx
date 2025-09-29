import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'sleek_settings_v1';
const DEFAULTS = { template: 'Modern', font: 'System', paper: 'Letter', logoDataUrl: '', fontLoaded: {} };
const EVT = 'sleek:settings_updated';

function readSettings() {
  try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) || '{}')) }; }
  catch { return { ...DEFAULTS }; }
}
function writeSettings(next) {
  localStorage.setItem(KEY, JSON.stringify(next));
  try { window.dispatchEvent(new CustomEvent(EVT, { detail: next })); } catch {}
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => readSettings());

  // Core setter merges patch, persists, and re-renders
  const set = useCallback((patch) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      writeSettings(next);
      return next;
    });
  }, []);

  // Cross-tab + external listeners (optional but safe)
  useEffect(() => {
    const onStorage = (e) => { if (e.key === KEY) setSettings(readSettings()); };
    const onEvent = (e) => setSettings(e.detail || readSettings());
    window.addEventListener('storage', onStorage);
    window.addEventListener(EVT, onEvent);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(EVT, onEvent);
    };
  }, []);

  // Convenience setters
  const api = useMemo(() => ({
    settings,
    template: settings.template,
    font: settings.font,
    paper: settings.paper,
    logoDataUrl: settings.logoDataUrl,
    setTemplate: (template) => set({ template }),
    setFont: (font) => set({ font }),
    setPaper: (paper) => set({ paper }),
    setLogo: (logoDataUrl) => set({ logoDataUrl }),
  }), [settings, set]);

  return <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>;
}

export default function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within <SettingsProvider>');
  return ctx;
}

export { KEY as SETTINGS_KEY, DEFAULTS as SETTINGS_DEFAULTS };