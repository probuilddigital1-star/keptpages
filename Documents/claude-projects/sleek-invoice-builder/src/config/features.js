/**
 * Feature Flags Configuration
 * Control which features are enabled in the app
 */

// Check environment
const isDevelopment = import.meta.env?.DEV || false;
const isProduction = import.meta.env?.PROD || false;

// Firebase integration flag
// Set to true to use Firebase for data storage
// Set to false to use localStorage only
export const USE_FIREBASE = true; // Firebase indexes have been deployed

// Other feature flags
export const features = {
  // Data storage
  useFirebase: USE_FIREBASE,
  autoMigrate: USE_FIREBASE && isDevelopment, // Auto-migrate localStorage to Firebase in dev

  // Authentication
  requireAuth: USE_FIREBASE, // Require authentication when Firebase is enabled
  allowGoogleSignIn: false, // Enable Google Sign-In (requires additional setup)

  // Subscriptions
  enableSubscriptions: true,
  showUpgradePrompts: true,

  // Features
  enableAnalytics: isProduction,
  enableOfflineMode: true,
  enableCloudSync: USE_FIREBASE,

  // Development
  showDebugInfo: isDevelopment,
  logToConsole: isDevelopment
};

// Helper to check if a feature is enabled
export function isFeatureEnabled(featureName) {
  return features[featureName] === true;
}

// Log current configuration
if (isDevelopment) {
  // console.log('🎛️ Feature Flags:', features);
}