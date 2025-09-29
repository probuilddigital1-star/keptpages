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

    // Deep merge for paymentMethods to ensure all fields exist
    const result = { ...DEFAULTS, ...parsed };

    // Ensure paymentMethods has all required fields
    if (result.paymentMethods) {
      result.paymentMethods = {
        ...DEFAULTS.paymentMethods,
        ...result.paymentMethods
      };
    } else {
      result.paymentMethods = { ...DEFAULTS.paymentMethods };
    }

    // Debug logging
    console.log('getSettings - Loaded payment methods:', JSON.stringify(result.paymentMethods, null, 2));

    return result;
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(patch) {
  const current = getSettings();

  // Deep merge for paymentMethods if it's being updated
  let next = { ...current, ...patch };

  if (patch.paymentMethods && current.paymentMethods) {
    next.paymentMethods = {
      ...current.paymentMethods,
      ...patch.paymentMethods
    };
  }

  console.log('saveSettings - Saving to localStorage:', JSON.stringify(next, null, 2));

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

// Helper to get settings sync lazily to avoid circular dependency
const getSettingsSync = () => import('../services/settingsSync').then(m => m.default);

// Write helpers with Firestore sync
export const setTemplate = (name) => {
  const result = saveSettings({ template: name });
  getSettingsSync().then(sync => sync.syncSetting('template', name)).catch(console.error);
  return result;
};

export const setFont = (name) => {
  const result = saveSettings({ font: name });
  getSettingsSync().then(sync => sync.syncSetting('font', name)).catch(console.error);
  return result;
};

export const setPaper = (size) => {
  const result = saveSettings({ paper: size });
  getSettingsSync().then(sync => sync.syncSetting('paper', size)).catch(console.error);
  return result;
};

export const setLogo = (dataUrl) => {
  console.log('[Settings Store] setLogo called with data length:', dataUrl ? dataUrl.length : 0);
  const result = saveSettings({ logoDataUrl: dataUrl || '' });
  console.log('[Settings Store] Logo saved to localStorage');

  // Sync logo to Firestore (will check subscription automatically)
  console.log('[Settings Store] Triggering Firestore sync for logo');
  getSettingsSync()
    .then(sync => {
      console.log('[Settings Store] Got settingsSync, calling syncLogo');
      return sync.syncLogo(dataUrl || '');
    })
    .then(success => {
      console.log('[Settings Store] Logo sync result:', success);
    })
    .catch(error => {
      console.error('[Settings Store] Error syncing logo:', error);
    });

  return result;
};

export const markFontLoaded = (name) => saveSettings({ fontLoaded: { ...getFontLoadedMap(), [name]: true } });

export const setBusinessName = (name) => {
  const result = saveSettings({ business_name: name || '' });
  getSettingsSync().then(sync => sync.syncSetting('business_name', name || '')).catch(console.error);
  return result;
};

export const setBusinessEmail = (email) => {
  const result = saveSettings({ business_email: email || '' });
  getSettingsSync().then(sync => sync.syncSetting('business_email', email || '')).catch(console.error);
  return result;
};

export const setBusinessPhone = (phone) => {
  const result = saveSettings({ business_phone: phone || '' });
  getSettingsSync().then(sync => sync.syncSetting('business_phone', phone || '')).catch(console.error);
  return result;
};

export const setBusinessAddress = (address) => {
  const result = saveSettings({ business_address: address || '' });
  getSettingsSync().then(sync => sync.syncSetting('business_address', address || '')).catch(console.error);
  return result;
};

export const setBusinessInfo = (info) => {
  const result = saveSettings({
    business_name: info.business_name || '',
    business_email: info.business_email || '',
    business_phone: info.business_phone || '',
    business_address: info.business_address || ''
  });
  getSettingsSync().then(sync => sync.syncBusinessInfo(info)).catch(console.error);
  return result;
};

export const setPaymentMethods = (methods) => {
  const result = saveSettings({ paymentMethods: methods || {} });
  getSettingsSync().then(sync => sync.syncSetting('paymentMethods', methods || {})).catch(console.error);
  return result;
};

// Load settings from Firestore (called after login)
export const loadSettingsFromFirestore = async () => {
  try {
    console.log('[Settings Store] loadSettingsFromFirestore called');
    const settingsSync = await getSettingsSync();
    console.log('[Settings Store] Got settingsSync, calling loadFromFirestore');
    const loadedSettings = await settingsSync.loadFromFirestore();
    if (loadedSettings) {
      console.log('[Settings Store] Successfully loaded settings from Firestore:', loadedSettings);
      // Check specifically for logo
      if (loadedSettings.logoDataUrl) {
        console.log('[Settings Store] Logo loaded from Firestore (length:', loadedSettings.logoDataUrl.length, ')');
      } else {
        console.log('[Settings Store] No logo found in Firestore settings');
      }
    } else {
      console.log('[Settings Store] No settings loaded from Firestore (returned null)');
    }
    return loadedSettings;
  } catch (error) {
    console.error('[Settings Store] Failed to load settings from Firestore:', error);
    return null;
  }
};

// Exports for hooks
export const SETTINGS_UPDATED_EVENT = EVT;
export const SETTINGS_KEY = KEY;