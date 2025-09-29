import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService';
import { updateUserSubscription } from '../utils/updateUserSubscription';
import { getLogo } from '../store/settings';

export default function DebugSubscription() {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [showDebug, setShowDebug] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [logoData, setLogoData] = useState('');

  useEffect(() => {
    // Check for debug mode in URL or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const debugMode = urlParams.get('debug') === 'true' || localStorage.getItem('debugMode') === 'true';
    setShowDebug(debugMode);

    if (debugMode) {
      const currentLogo = getLogo();
      setLogoData(currentLogo ? `Logo present (${currentLogo.length} chars)` : 'No logo');
    }
  }, []);

  const handleUpdateSubscription = async (tier, type) => {
    if (!user?.uid) {
      alert('No user logged in');
      return;
    }

    setUpdating(true);
    try {
      console.log(`[DebugSubscription] Updating subscription to ${tier} (${type})`);
      const success = await updateUserSubscription(user.uid, tier, type);

      if (success) {
        console.log('[DebugSubscription] Subscription updated, refreshing profile...');
        await refreshUserProfile();
        alert(`Subscription updated to ${tier} (${type}). Please refresh the page.`);
        window.location.reload();
      } else {
        alert('Failed to update subscription');
      }
    } catch (error) {
      console.error('[DebugSubscription] Error:', error);
      alert('Error updating subscription: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const testLogoSync = async () => {
    console.log('[DebugSubscription] Testing logo sync...');
    console.log('[DebugSubscription] Current user:', user?.email);
    console.log('[DebugSubscription] User profile:', userProfile);
    console.log('[DebugSubscription] Subscription:', userProfile?.subscription);
    console.log('[DebugSubscription] Can use logo:', authService.canUseLogo());
    console.log('[DebugSubscription] Logo in localStorage:', logoData);

    // Try to load settings from Firestore
    try {
      const { loadSettingsFromFirestore } = await import('../store/settings');
      const settings = await loadSettingsFromFirestore();
      console.log('[DebugSubscription] Settings loaded from Firestore:', settings);
    } catch (error) {
      console.error('[DebugSubscription] Error loading settings:', error);
    }
  };

  if (!showDebug) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      background: 'white',
      border: '2px solid #ccc',
      borderRadius: 8,
      padding: 16,
      zIndex: 9999,
      maxWidth: 400,
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 'bold' }}>
        Debug Subscription Panel
      </h3>

      <div style={{ fontSize: 12, marginBottom: 12 }}>
        <div><strong>User:</strong> {user?.email || 'Not logged in'}</div>
        <div><strong>UID:</strong> {user?.uid || 'N/A'}</div>
        <div><strong>Subscription:</strong> {userProfile?.subscription?.tier || 'Unknown'}</div>
        <div><strong>Status:</strong> {userProfile?.subscription?.status || 'Unknown'}</div>
        <div><strong>Type:</strong> {userProfile?.subscription?.type || 'Unknown'}</div>
        <div><strong>Can use logo:</strong> {authService.canUseLogo() ? 'Yes' : 'No'}</div>
        <div><strong>Logo data:</strong> {logoData}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={() => handleUpdateSubscription('starter', 'monthly')}
          disabled={updating}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: updating ? 'not-allowed' : 'pointer',
            opacity: updating ? 0.6 : 1
          }}
        >
          Set Starter (Monthly)
        </button>

        <button
          onClick={() => handleUpdateSubscription('pro', 'monthly')}
          disabled={updating}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: updating ? 'not-allowed' : 'pointer',
            opacity: updating ? 0.6 : 1
          }}
        >
          Set Pro (Monthly)
        </button>

        <button
          onClick={() => handleUpdateSubscription('pro', 'lifetime')}
          disabled={updating}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            background: '#9C27B0',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: updating ? 'not-allowed' : 'pointer',
            opacity: updating ? 0.6 : 1
          }}
        >
          Set Pro (Lifetime)
        </button>

        <button
          onClick={testLogoSync}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            background: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Test Logo Sync
        </button>

        <button
          onClick={() => {
            localStorage.removeItem('debugMode');
            setShowDebug(false);
          }}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Close Debug Panel
        </button>
      </div>

      <div style={{ marginTop: 12, fontSize: 10, color: '#666' }}>
        Open console to see detailed logs
      </div>
    </div>
  );
}