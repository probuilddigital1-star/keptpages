import React from 'react';
import { Platform, View, Text } from '../utils/platformComponents';
import { useAuth } from '../contexts/AuthContext';

const Watermark = ({ children, className = '' }) => {
  const { isPremium } = useAuth();
  
  // Don't show watermark for premium users
  if (isPremium && isPremium()) {
    return <>{children}</>;
  }

  // Web version
  if (Platform.OS === 'web') {
    return (
      <div className={`relative ${className}`}>
        {children}
        <div 
          className="watermark-container absolute bottom-2 right-2 md:bottom-4 md:right-4 opacity-50 pointer-events-none select-none z-10"
          style={{
            fontSize: '12px',
            fontWeight: '500',
            color: '#6b7280',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid rgba(107, 114, 128, 0.2)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            maxWidth: '180px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg style={{ width: '14px', height: '14px', flexShrink: 0 }} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
              <path d="M8 12h8v2H8zm0 4h8v2H8zm0-8h4v2H8z"/>
            </svg>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: '600', color: '#4b5563', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Created with Sleek Invoice
              </div>
              <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Upgrade to Pro to remove
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // React Native version
  return (
    <View style={{ position: 'relative', flex: 1 }}>
      {children}
      <View 
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          opacity: 0.5,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: 'rgba(107, 114, 128, 0.2)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 2,
          zIndex: 10
        }}
        pointerEvents="none"
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#4b5563' }}>
          Created with Sleek Invoice
        </Text>
        <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
          Upgrade to Pro to remove watermark
        </Text>
      </View>
    </View>
  );
};

// For PDF generation - static watermark text
export const getWatermarkText = () => ({
  main: 'Created with Sleek Invoice',
  sub: 'Upgrade to Pro to remove watermark'
});

export default Watermark;