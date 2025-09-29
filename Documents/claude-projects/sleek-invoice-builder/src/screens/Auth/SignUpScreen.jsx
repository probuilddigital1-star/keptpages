import React, { useState } from 'react';
import { View, Text, Platform, KeyboardAvoidingView, ScrollView, TouchableOpacity, ActivityIndicator } from '../../utils/platformComponents';
import { motion } from 'framer-motion';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';

const SignUpScreen = ({ navigation, onSwitchToLogin }) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signUp } = useAuth();

  const handleSignUp = async () => {
    // Validation
    if (!displayName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signUp(email, password, displayName);
      // Navigation will be handled by auth state change
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
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
          <Text className="text-lg text-gray-600 dark:text-gray-400">Start your free account</Text>
        </View>

        <Card className="p-8" shadow="premium">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create Account</Text>
          
          {error && (
            <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          )}

          <View className="space-y-4">
            <Input
              label="Business Name"
              placeholder="Your Business"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              editable={!loading}
            />

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
              helperText="At least 6 characters"
            />

            <Input
              label="Confirm Password"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
            />

            <Button
              onPress={handleSignUp}
              variant="primary"
              disabled={loading}
              className="w-full mt-6"
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                'Create Free Account'
              )}
            </Button>
          </View>

          <View className="mt-6 text-center">
            <Text className="text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <TouchableOpacity onPress={onSwitchToLogin} disabled={loading}>
                <Text className="text-primary font-semibold">Sign in</Text>
              </TouchableOpacity>
            </Text>
          </View>
        </Card>

        {/* Free tier benefits */}
        <View className="mt-8 bg-accent-50 p-4 rounded-lg">
          <Text className="text-accent-800 font-semibold mb-2">Free Plan Includes:</Text>
          <View className="space-y-1">
            <Text className="text-accent-700">• 3 invoices per month</Text>
            <Text className="text-accent-700">• 1 professional template</Text>
            <Text className="text-accent-700">• Basic invoice management</Text>
            <Text className="text-accent-700">• PDF export with watermark</Text>
          </View>
          <Text className="text-accent-800 mt-3 font-medium">
            Upgrade to Pro for unlimited features!
          </Text>
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

export default SignUpScreen;