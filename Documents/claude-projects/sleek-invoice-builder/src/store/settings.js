const KEY = 'sleek_settings_v1';
const EVT = 'sleek:settings_updated';

const DEFAULTS = {
  template: 'Modern',
  font: 'System',
  paper: 'Letter',
  logoDataUrl: '',
  fontLoaded: {},
  // Business information
  business_name: '',
  business_email: '',
  business_phone: '',
  business_address: '',
  // Payment methods
  paymentMethods: {
    paypalEmail: '',
    venmoHandle: '',
    zelleEmail: '',
    cashappHandle: '',
    bankName: '',
    bankAccount: '',
    bankRouting: ''
  }
};

export function getSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  try { window.dispatchEvent(new CustomEvent(EVT, { detail: next })); } catch {}
  return next;
}

// Read helpers
export const getTemplate = () => getSettings().template;
export const getFont = () => getSettings().font;
export const getPaper = () => getSettings().paper;
export const getLogo = () => getSettings().logoDataUrl;
export const getFontLoadedMap = () => getSettings().fontLoaded || {};
export const getBusinessName = () => getSettings().business_name;
export const getBusinessEmail = () => getSettings().business_email;
export const getBusinessPhone = () => getSettings().business_phone;
export const getBusinessAddress = () => getSettings().business_address;
export const getPaymentMethods = () => getSettings().paymentMethods || {};

// Write helpers (always route through saveSettings)
export const setTemplate = (name) => saveSettings({ template: name });
export const setFont = (name) => saveSettings({ font: name });
export const setPaper = (size) => saveSettings({ paper: size });
export const setLogo = (dataUrl) => saveSettings({ logoDataUrl: dataUrl || '' });
export const markFontLoaded = (name) => saveSettings({ fontLoaded: { ...getFontLoadedMap(), [name]: true } });
export const setBusinessName = (name) => saveSettings({ business_name: name || '' });
export const setBusinessEmail = (email) => saveSettings({ business_email: email || '' });
export const setBusinessPhone = (phone) => saveSettings({ business_phone: phone || '' });
export const setBusinessAddress = (address) => saveSettings({ business_address: address || '' });
export const setBusinessInfo = (info) => saveSettings({
  business_name: info.business_name || '',
  business_email: info.business_email || '',
  business_phone: info.business_phone || '',
  business_address: info.business_address || ''
});
export const setPaymentMethods = (methods) => saveSettings({ paymentMethods: methods || {} });

// Exports for hooks
export const SETTINGS_UPDATED_EVENT = EVT;
export const SETTINGS_KEY = KEY;