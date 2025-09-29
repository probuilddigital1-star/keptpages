import React, { useState } from 'react';
import { Platform } from '../../utils/platformComponents';
import { AnimatePresence } from 'framer-motion';
import LoginScreen from './LoginScreen';
import SignUpScreen from './SignUpScreen';

const AuthScreen = ({ navigation }) => {
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'

  const switchToLogin = () => setAuthMode('login');
  const switchToSignUp = () => setAuthMode('signup');

  if (Platform.OS === 'web') {
    return (
      <AnimatePresence mode="wait">
        {authMode === 'login' ? (
          <LoginScreen 
            key="login"
            navigation={navigation}
            onSwitchToSignUp={switchToSignUp}
          />
        ) : (
          <SignUpScreen 
            key="signup"
            navigation={navigation}
            onSwitchToLogin={switchToLogin}
          />
        )}
      </AnimatePresence>
    );
  }

  return authMode === 'login' ? (
    <LoginScreen 
      navigation={navigation}
      onSwitchToSignUp={switchToSignUp}
    />
  ) : (
    <SignUpScreen 
      navigation={navigation}
      onSwitchToLogin={switchToLogin}
    />
  );
};

export default AuthScreen;