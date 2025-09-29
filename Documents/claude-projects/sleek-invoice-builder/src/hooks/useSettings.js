import { useEffect, useState } from 'react';
import {
  getSettings, SETTINGS_UPDATED_EVENT, SETTINGS_KEY,
  getTemplate, setTemplate,
  getFont, setFont,
  getPaper, setPaper,
  getLogo, setLogo
} from '../store/settings';

const DEFAULTS = { template: 'Modern', font: 'System', paper: 'Letter', logoDataUrl: '' };

export default function useSettings() {
  const [settings, setSettings] = useState(() => ({ ...DEFAULTS, ...getSettings() }));

  useEffect(() => {
    const onUpdate = (e) => setSettings({ ...DEFAULTS, ...(e.detail || getSettings()) });
    const onStorage = (e) => { if (e.key === SETTINGS_KEY) setSettings({ ...DEFAULTS, ...getSettings() }); };
    window.addEventListener(SETTINGS_UPDATED_EVENT, onUpdate);
    window.addEventListener('storage', onStorage);
    // ensure initial hydration
    setSettings({ ...DEFAULTS, ...getSettings() });
    return () => {
      window.removeEventListener(SETTINGS_UPDATED_EVENT, onUpdate);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const template = settings.template ?? getTemplate();
  const font = settings.font ?? getFont();
  const paper = settings.paper ?? getPaper();
  const logoDataUrl = settings.logoDataUrl ?? getLogo();

  return { settings, template, setTemplate, font, setFont, paper, setPaper, logoDataUrl, setLogo };
}