import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import authService from '../services/authService';
import subscriptionService from '../services/subscriptionService';
import { loadSettingsFromFirestore } from '../store/settings';
import { logInfo, logError } from '../utils/errorHandler';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Subscribe to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // User is signed in
          logInfo('AuthContext', `User authenticated: ${firebaseUser.email}`);
          setUser(firebaseUser);

          // Set currentUser BEFORE loading profile (needed for settingsSync)
          authService.currentUser = firebaseUser;

          // Load user profile from Firestore
          const profile = await authService.loadUserProfile(firebaseUser.uid);
          if (profile) {
            setUserProfile(profile);
            authService.userProfile = profile;
          } else {
            // Create profile if it doesn't exist
            const newProfile = await authService.initializeUserProfile(firebaseUser);
            setUserProfile(newProfile);
            authService.currentUser = firebaseUser;
            authService.userProfile = newProfile;
          }

          // Load user settings from Firestore (logo, business info, etc.)
          try {
            console.log('[AuthContext] About to load settings from Firestore for user:', firebaseUser.email);
            const loadedSettings = await loadSettingsFromFirestore();
            console.log('[AuthContext] Settings load result:', loadedSettings);
            logInfo('AuthContext', 'User settings loaded from Firestore');
          } catch (error) {
            console.error('[AuthContext] Error loading settings:', error);
            logError('AuthContext.loadSettings', error);
            // Continue even if settings fail to load
          }

          // Initialize IAP if on mobile
          subscriptionService.initializeIAP();
          subscriptionService.setupPurchaseListeners();
        } else {
          // User is signed out
          logInfo('AuthContext', 'User signed out');
          setUser(null);
          setUserProfile(null);
          authService.currentUser = null;
          authService.userProfile = null;
          subscriptionService.cleanupPurchaseListeners();
        }
      } catch (error) {
        logError('AuthContext.onAuthStateChanged', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      subscriptionService.cleanupPurchaseListeners();
    };
  }, []);

  const signUp = async (email, password, displayName) => {
    setError(null);
    try {
      const result = await authService.signUp(email, password, displayName);
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const signIn = async (email, password) => {
    setError(null);
    try {
      const result = await authService.signIn(email, password);
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      await authService.signOut();
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const resetPassword = async (email) => {
    setError(null);
    try {
      await authService.resetPassword(email);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const updateProfile = async (updates) => {
    setError(null);
    try {
      const updatedProfile = await authService.updateUserProfile(updates);
      setUserProfile(updatedProfile);
      return updatedProfile;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const canCreateInvoice = () => {
    return authService.canCreateInvoice();
  };

  const getRemainingFreeInvoices = () => {
    return authService.getRemainingFreeInvoices();
  };

  const canUseTemplates = () => {
    return authService.canUseTemplates();
  };

  const isPremium = () => {
    return authService.isPremium();
  };

  const getSubscriptionStatus = () => {
    return authService.getSubscriptionStatus();
  };

  const incrementInvoiceUsage = async () => {
    await authService.incrementInvoiceUsage();
    // Refresh user profile to get updated usage
    if (user) {
      const updatedProfile = await authService.loadUserProfile(user.uid);
      setUserProfile(updatedProfile);
    }
  };

  const refreshUserProfile = async () => {
    if (user) {
      try {
        logInfo('AuthContext', 'Refreshing user profile');
        const updatedProfile = await authService.loadUserProfile(user.uid);
        setUserProfile(updatedProfile);
        authService.userProfile = updatedProfile;
        return updatedProfile;
      } catch (error) {
        logError('AuthContext.refreshUserProfile', error);
        throw error;
      }
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    canCreateInvoice,
    getRemainingFreeInvoices,
    canUseTemplates,
    isPremium,
    getSubscriptionStatus,
    incrementInvoiceUsage,
    refreshUserProfile
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};