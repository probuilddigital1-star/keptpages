import React, { useState } from 'react';
import { View, Text, Platform, KeyboardAvoidingView, ScrollView, TouchableOpacity, ActivityIndicator } from '../../utils/platformComponents';
import { motion } from 'framer-motion';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';

const LoginScreen = ({ navigation, onSwitchToSignUp }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
      // Navigation will be handled by auth state change
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // Navigate to forgot password screen
    if (navigation) {
      navigation.navigate('ForgotPassword');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  const content = (
    <View className="flex-1 justify-center px-6 py-12 bg-gray-50 dark:bg-gray-900">
      <View className="max-w-md w-full mx-auto">
        {/* Logo and Title */}
        <View className="mb-8 text-center">
          <Text className="text-2xl font-bold text-primary mb-2">Sleek Invoice</Text>
          <Text className="text-lg text-gray-600 dark:text-gray-400">Professional invoicing made simple</Text>
        </View>

        <Card className="p-8" shadow="premium">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Welcome Back</Text>
          
          {error && (
            <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          )}

          <View className="space-y-4">
            <Input
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <Input
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />

            <TouchableOpacity 
              onPress={handleForgotPassword}
              disabled={loading}
              className="self-end"
            >
              <Text className="text-sm text-primary hover:text-primary-dark">Forgot password?</Text>
            </TouchableOpacity>

            <Button
              onPress={handleLogin}
              variant="primary"
              disabled={loading}
              className="w-full mt-6"
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                'Sign In'
              )}
            </Button>
          </View>

          <View className="mt-6 text-center">
            <Text className="text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <TouchableOpacity onPress={onSwitchToSignUp} disabled={loading}>
                <Text className="text-primary font-semibold">Sign up for free</Text>
              </TouchableOpacity>
            </Text>
          </View>
        </Card>

        {/* Feature highlights */}
        <View className="mt-8 space-y-2">
          <View className="flex-row items-center">
            <svg className="w-4 h-4 text-status-success mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <Text className="text-gray-600 dark:text-gray-400">3 free invoices per month</Text>
          </View>
          <View className="flex-row items-center">
            <svg className="w-4 h-4 text-status-success mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <Text className="text-gray-600 dark:text-gray-400">Professional templates</Text>
          </View>
          <View className="flex-row items-center">
            <svg className="w-4 h-4 text-status-success mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <Text className="text-gray-600 dark:text-gray-400">Upgrade anytime for unlimited features</Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="min-h-screen"
      >
        {content}
      </motion.div>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {content}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;