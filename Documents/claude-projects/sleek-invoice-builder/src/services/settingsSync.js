import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import authService from './authService';
import { logError, logInfo } from '../utils/errorHandler';
import * as settingsStore from '../store/settings';

class SettingsSync {
  constructor() {
    this.isSyncing = false;
    this.syncQueue = [];
  }

  /**
   * Load user preferences from Firestore and apply to localStorage
   */
  async loadFromFirestore() {
    try {
      if (!authService.currentUser) {
        console.log('[SettingsSync] No authenticated user, skipping load');
        logInfo('SettingsSync.loadFromFirestore', 'No authenticated user, skipping load');
        return null;
      }

      console.log('[SettingsSync] Loading settings for user:', authService.currentUser.email);
      const userDoc = await getDoc(doc(db, 'users', authService.currentUser.uid));

      if (!userDoc.exists()) {
        console.log('[SettingsSync] User document not found in Firestore');
        logInfo('SettingsSync.loadFromFirestore', 'User document not found');
        return null;
      }

      const userData = userDoc.data();
      const preferences = userData.preferences || {};

      console.log('[SettingsSync] User data from Firestore:', userData);
      console.log('[SettingsSync] Preferences from Firestore:', preferences);
      console.log('[SettingsSync] User subscription:', userData.subscription);
      logInfo('SettingsSync.loadFromFirestore', 'Loading user preferences', preferences);

      // Map Firestore preferences to localStorage settings
      const settingsToApply = {};

      // Logo (only for users with appropriate subscription)
      const canUseLogo = authService.canUseLogo();
      console.log('[SettingsSync] Can use logo:', canUseLogo);
      console.log('[SettingsSync] Logo in preferences:', preferences.defaultLogo ? 'Yes (length: ' + preferences.defaultLogo.length + ')' : 'No');

      if (preferences.defaultLogo && canUseLogo) {
        settingsToApply.logoDataUrl = preferences.defaultLogo;
        console.log('[SettingsSync] Will apply logo to localStorage');
      } else if (preferences.defaultLogo && !canUseLogo) {
        console.log('[SettingsSync] Logo exists but user cannot use logo feature');
      }

      // Business info
      if (preferences.businessName) settingsToApply.business_name = preferences.businessName;
      if (preferences.businessEmail) settingsToApply.business_email = preferences.businessEmail;
      if (preferences.businessPhone) settingsToApply.business_phone = preferences.businessPhone;
      if (preferences.businessAddress) settingsToApply.business_address = preferences.businessAddress;

      // Template and font preferences
      if (preferences.template) settingsToApply.template = preferences.template;
      if (preferences.font) settingsToApply.font = preferences.font;
      if (preferences.paper) settingsToApply.paper = preferences.paper;

      // Payment methods
      if (preferences.paymentMethods) {
        settingsToApply.paymentMethods = preferences.paymentMethods;
      }

      // Apply to localStorage via settings store
      if (Object.keys(settingsToApply).length > 0) {
        console.log('[SettingsSync] Applying settings to localStorage:', settingsToApply);
        settingsStore.saveSettings(settingsToApply);
        logInfo('SettingsSync.loadFromFirestore', 'Applied settings to localStorage');
        console.log('[SettingsSync] Settings applied successfully');
      } else {
        console.log('[SettingsSync] No settings to apply to localStorage');
      }

      return settingsToApply;
    } catch (error) {
      logError('SettingsSync.loadFromFirestore', error);
      return null;
    }
  }

  /**
   * Save current localStorage settings to Firestore
   */
  async saveToFirestore(specificSettings = null) {
    try {
      if (!authService.currentUser) {
        logInfo('SettingsSync.saveToFirestore', 'No authenticated user, skipping save');
        return false;
      }

      // Prevent duplicate syncs
      if (this.isSyncing) {
        this.syncQueue.push(specificSettings);
        return false;
      }

      this.isSyncing = true;

      // Get current settings from localStorage
      const currentSettings = settingsStore.getSettings();

      // Build preferences object for Firestore
      const preferencesToSave = {
        updatedAt: serverTimestamp()
      };

      // Only save specific settings if provided, otherwise save all
      const settingsToSync = specificSettings || currentSettings;

      // Logo (only for users with appropriate subscription)
      const canUseLogo = authService.canUseLogo();
      console.log('[SettingsSync] Saving - Can use logo:', canUseLogo);
      console.log('[SettingsSync] Saving - logoDataUrl in settingsToSync:', 'logoDataUrl' in settingsToSync);

      if ('logoDataUrl' in settingsToSync) {
        if (canUseLogo) {
          preferencesToSave.defaultLogo = settingsToSync.logoDataUrl || '';
          console.log('[SettingsSync] Will save logo to Firestore (length:', (settingsToSync.logoDataUrl || '').length, ')');
        } else {
          console.log('[SettingsSync] Logo provided but user cannot use logo feature - skipping save');
        }
      }

      // Business info
      if ('business_name' in settingsToSync) {
        preferencesToSave.businessName = settingsToSync.business_name || '';
      }
      if ('business_email' in settingsToSync) {
        preferencesToSave.businessEmail = settingsToSync.business_email || '';
      }
      if ('business_phone' in settingsToSync) {
        preferencesToSave.businessPhone = settingsToSync.business_phone || '';
      }
      if ('business_address' in settingsToSync) {
        preferencesToSave.businessAddress = settingsToSync.business_address || '';
      }

      // Template and font preferences
      if ('template' in settingsToSync) {
        preferencesToSave.template = settingsToSync.template || 'Modern';
      }
      if ('font' in settingsToSync) {
        preferencesToSave.font = settingsToSync.font || 'System';
      }
      if ('paper' in settingsToSync) {
        preferencesToSave.paper = settingsToSync.paper || 'Letter';
      }

      // Payment methods
      if ('paymentMethods' in settingsToSync && settingsToSync.paymentMethods) {
        preferencesToSave.paymentMethods = settingsToSync.paymentMethods;
      }

      // Update Firestore
      const userRef = doc(db, 'users', authService.currentUser.uid);
      await updateDoc(userRef, {
        preferences: preferencesToSave
      });

      console.log('[SettingsSync] Saved preferences to Firestore:', preferencesToSave);
      logInfo('SettingsSync.saveToFirestore', 'Saved preferences to Firestore', preferencesToSave);

      // Process any queued syncs
      this.isSyncing = false;
      if (this.syncQueue.length > 0) {
        const nextSync = this.syncQueue.shift();
        await this.saveToFirestore(nextSync);
      }

      return true;
    } catch (error) {
      logError('SettingsSync.saveToFirestore', error);
      this.isSyncing = false;
      return false;
    }
  }

  /**
   * Sync a specific setting immediately
   */
  async syncSetting(key, value) {
    const settingToSync = { [key]: value };
    return this.saveToFirestore(settingToSync);
  }

  /**
   * Sync logo data specifically
   */
  async syncLogo(logoDataUrl) {
    console.log('[SettingsSync] syncLogo called with data length:', logoDataUrl ? logoDataUrl.length : 0);
    const canUseLogo = authService.canUseLogo();
    console.log('[SettingsSync] syncLogo - Can use logo:', canUseLogo);
    console.log('[SettingsSync] syncLogo - User profile:', authService.userProfile);
    console.log('[SettingsSync] syncLogo - Subscription:', authService.userProfile?.subscription);

    if (!canUseLogo) {
      console.log('[SettingsSync] User subscription does not include logo feature');
      logInfo('SettingsSync.syncLogo', 'User subscription does not include logo feature');
      return false;
    }

    console.log('[SettingsSync] Proceeding to sync logo to Firestore');
    return this.syncSetting('logoDataUrl', logoDataUrl);
  }

  /**
   * Sync business info
   */
  async syncBusinessInfo(info) {
    const businessSettings = {};
    if (info.business_name !== undefined) businessSettings.business_name = info.business_name;
    if (info.business_email !== undefined) businessSettings.business_email = info.business_email;
    if (info.business_phone !== undefined) businessSettings.business_phone = info.business_phone;
    if (info.business_address !== undefined) businessSettings.business_address = info.business_address;

    return this.saveToFirestore(businessSettings);
  }

  /**
   * Full sync - load from Firestore then save current state back
   */
  async fullSync() {
    await this.loadFromFirestore();
    await this.saveToFirestore();
  }
}

// Export singleton instance
const settingsSync = new SettingsSync();
export default settingsSync;