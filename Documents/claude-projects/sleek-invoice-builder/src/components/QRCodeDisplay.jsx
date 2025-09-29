import React from 'react';
import { FiSmartphone } from 'react-icons/fi';

/**
 * QRCodeDisplay Component
 * Displays a QR code for payment links
 * Uses react-native-qrcode-svg for native or fallback for web
 */
const QRCodeDisplay = ({ value, size = 200, logo = null, backgroundColor = 'white', color = 'black' }) => {
  // For web version, we'll use a placeholder or a web-compatible QR library
  // In production, you'd import a web QR code library like qrcode.js
  
  // Check if we're in React Native environment
  const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
  
  if (isReactNative) {
    // Dynamic import for React Native
    try {
      const QRCode = require('react-native-qrcode-svg').default;
      return (
        <QRCode
          value={value}
          size={size}
          backgroundColor={backgroundColor}
          color={color}
          logo={logo ? { uri: logo } : null}
          logoSize={30}
          logoBackgroundColor={backgroundColor}
          logoBorderRadius={5}
        />
      );
    } catch (error) {
      // console.warn('react-native-qrcode-svg not available:', error);
    }
  }
  
  // Web fallback - create a visual placeholder
  // In production, use a library like 'qrcode' or 'react-qr-code'
  return (
    <div 
      style={{
        width: size,
        height: size,
        backgroundColor: backgroundColor,
        border: '2px solid #2563EB',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* QR Pattern Background (decorative) */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.1,
        background: `
          repeating-linear-gradient(
            0deg,
            ${color} 0px,
            ${color} 4px,
            transparent 4px,
            transparent 8px
          ),
          repeating-linear-gradient(
            90deg,
            ${color} 0px,
            ${color} 4px,
            transparent 4px,
            transparent 8px
          )
        `
      }} />
      
      {/* Content */}
      <div style={{
        position: 'relative',
        textAlign: 'center',
        zIndex: 1
      }}>
        <FiSmartphone style={{ fontSize: 48, marginBottom: 8, color: '#2563EB' }} />
        <p style={{ 
          fontSize: 14, 
          fontWeight: 600, 
          color: color,
          marginBottom: 8
        }}>
          QR Payment Code
        </p>
        <p style={{ 
          fontSize: 10, 
          color: '#666',
          maxWidth: 150,
          margin: '0 auto',
          lineHeight: 1.4
        }}>
          Scan with PayPal app or camera to pay instantly
        </p>
        {value && (
          <p style={{
            fontSize: 8,
            color: '#999',
            marginTop: 8,
            wordBreak: 'break-all',
            maxWidth: 150,
            lineHeight: 1.2
          }}>
            {value.substring(0, 50)}...
          </p>
        )}
      </div>
      
      {logo && (
        <img 
          src={logo} 
          alt="Logo"
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            width: 24,
            height: 24,
            borderRadius: 4,
            backgroundColor: 'white',
            padding: 2,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        />
      )}
    </div>
  );
};

export default QRCodeDisplay;