import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import authService from '../services/authService';
import { loadSettingsFromFirestore, getSettings, setLogo } from '../store/settings';

/**
 * Debug and fix logo sync for a specific user
 */
export async function debugLogoSync(email = 'zack.pearson@probuilddigital.com') {
  console.log('=== LOGO SYNC DEBUG ===');
  console.log('Checking user:', email);

  // Get current user
  const currentUser = authService.currentUser;
  if (!currentUser || currentUser.email !== email) {
    console.error('User not logged in or email mismatch');
    return;
  }

  console.log('Current user UID:', currentUser.uid);

  // Check Firestore data
  console.log('\n--- CHECKING FIRESTORE ---');
  const userRef = doc(db, 'users', currentUser.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    console.error('User document not found in Firestore!');
    return;
  }

  const userData = userDoc.data();
  console.log('User data from Firestore:', userData);
  console.log('Subscription:', userData.subscription);
  console.log('Preferences:', userData.preferences);
  console.log('Logo in preferences:', userData.preferences?.defaultLogo ?
    `Yes (${userData.preferences.defaultLogo.length} chars)` : 'No');

  // Check localStorage
  console.log('\n--- CHECKING LOCALSTORAGE ---');
  const localSettings = getSettings();
  console.log('Local settings:', localSettings);
  console.log('Logo in localStorage:', localSettings.logoDataUrl ?
    `Yes (${localSettings.logoDataUrl.length} chars)` : 'No');

  // Check subscription status
  console.log('\n--- CHECKING SUBSCRIPTION ---');
  console.log('authService.canUseLogo():', authService.canUseLogo());
  console.log('userProfile:', authService.userProfile);

  // Fix subscription if needed
  if (userData.subscription?.tier !== 'starter' && userData.subscription?.tier !== 'pro') {
    console.warn('User does not have starter or pro subscription!');
    console.log('Current tier:', userData.subscription?.tier);

    // You can uncomment this to fix the subscription
    // await fixUserSubscription(currentUser.uid, 'starter');
  }

  // Sync logo from Firestore to localStorage
  if (userData.preferences?.defaultLogo && !localSettings.logoDataUrl) {
    console.log('\n--- SYNCING LOGO FROM FIRESTORE TO LOCAL ---');
    await loadSettingsFromFirestore();
    console.log('Logo should now be in localStorage');
  }

  // Sync logo from localStorage to Firestore
  if (localSettings.logoDataUrl && !userData.preferences?.defaultLogo) {
    console.log('\n--- SYNCING LOGO FROM LOCAL TO FIRESTORE ---');
    setLogo(localSettings.logoDataUrl);
    console.log('Logo should now be in Firestore');
  }

  console.log('\n=== DEBUG COMPLETE ===');
  return {
    firestore: {
      subscription: userData.subscription,
      hasLogo: !!userData.preferences?.defaultLogo,
      logoLength: userData.preferences?.defaultLogo?.length || 0
    },
    localStorage: {
      hasLogo: !!localSettings.logoDataUrl,
      logoLength: localSettings.logoDataUrl?.length || 0
    },
    canUseLogo: authService.canUseLogo()
  };
}

/**
 * Fix user subscription tier
 */
export async function fixUserSubscription(uid, tier = 'starter') {
  console.log(`Fixing subscription for UID ${uid} to ${tier}`);

  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    'subscription.tier': tier,
    'subscription.status': 'active',
    'subscription.updatedAt': new Date()
  });

  console.log('Subscription updated in Firestore');

  // Reload user profile
  await authService.loadUserProfile(uid);
  console.log('User profile reloaded');

  return true;
}

/**
 * Force sync logo from localStorage to Firestore
 */
export async function forceSyncLogoToFirestore() {
  const localSettings = getSettings();
  if (!localSettings.logoDataUrl) {
    console.log('No logo in localStorage to sync');
    return false;
  }

  const currentUser = authService.currentUser;
  if (!currentUser) {
    console.error('No user logged in');
    return false;
  }

  console.log('Force syncing logo to Firestore...');
  const userRef = doc(db, 'users', currentUser.uid);
  await updateDoc(userRef, {
    'preferences.defaultLogo': localSettings.logoDataUrl
  });

  console.log('Logo synced to Firestore');
  return true;
}

/**
 * Force sync logo from Firestore to localStorage
 */
export async function forceSyncLogoFromFirestore() {
  const currentUser = authService.currentUser;
  if (!currentUser) {
    console.error('No user logged in');
    return false;
  }

  const userRef = doc(db, 'users', currentUser.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    console.error('User document not found');
    return false;
  }

  const userData = userDoc.data();
  if (!userData.preferences?.defaultLogo) {
    console.log('No logo in Firestore to sync');
    return false;
  }

  console.log('Force syncing logo from Firestore...');
  setLogo(userData.preferences.defaultLogo);
  console.log('Logo synced to localStorage');
  return true;
}

// Export functions to window for console access
if (typeof window !== 'undefined') {
  window.debugLogoSync = debugLogoSync;
  window.fixUserSubscription = fixUserSubscription;
  window.forceSyncLogoToFirestore = forceSyncLogoToFirestore;
  window.forceSyncLogoFromFirestore = forceSyncLogoFromFirestore;
}