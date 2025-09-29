import { logError, logInfo } from '../utils/errorHandler';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Platform, ActivityIndicator } from '../utils/platformComponents';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import subscriptionService from '../services/subscriptionService';
import Button from '../components/Button';
import Card from '../components/Card';

const SubscriptionScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const { userProfile, getSubscriptionStatus } = useAuth();
  const subscriptionStatus = getSubscriptionStatus();
  const pricing = subscriptionService.getPricing();

  useEffect(() => {
    // Initialize IAP and get products
    const loadProducts = async () => {
      if (Platform.OS === 'android') {
        const availableProducts = await subscriptionService.initializeIAP();
        setProducts(availableProducts);
      }
    };
    loadProducts();
  }, []);

  const handlePurchase = async (planType) => {
    setLoading(true);
    setSelectedPlan(planType);
    
    try {
      if (planType === 'monthly') {
        await subscriptionService.purchaseSubscription('com.sleekInvoice.pro.monthly');
      } else if (planType === 'yearly') {
        await subscriptionService.purchaseSubscription('com.sleekInvoice.pro.yearly');
      } else if (planType === 'lifetime') {
        await subscriptionService.purchaseLifetime();
      }
    } catch (error) {
      logError('SubscriptionScreen.purchase', error);
      // Show error to user
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const handleRestorePurchases = async () => {
    setLoading(true);
    try {
      await subscriptionService.restorePurchases();
      // Show success message
    } catch (error) {
      logError('SubscriptionScreen.restore', error);
      // Show error to user
    } finally {
      setLoading(false);
    }
  };

  const PlanCard = ({ plan, planKey, isCurrentPlan = false, isBestValue = false }) => {
    const cardContent = (
      <Card 
        className={`p-6 ${isBestValue ? 'border-2 border-accent-primary' : ''} ${
          isCurrentPlan ? 'bg-primary-50' : ''
        }`}
        shadow={isBestValue ? 'premium' : 'medium'}
      >
        {isBestValue && (
          <View className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <View className="bg-accent-primary px-4 py-1 rounded-full">
              <Text className="text-xs font-bold text-gray-900">BEST VALUE</Text>
            </View>
          </View>
        )}

        <View className="text-center mb-4">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            {plan.price}
          </Text>
          <Text className="text-gray-500">
            {plan.period === 'one-time' ? 'One-time purchase' : `per ${plan.period}`}
          </Text>
          {plan.savings && (
            <Text className="text-green-600 font-semibold">Save {plan.savings}</Text>
          )}
        </View>

        <View className="space-y-2 mb-6">
          {plan.features.map((feature, index) => (
            <View key={index} className="flex-row items-center">
              <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <Text className="text-gray-700 dark:text-gray-300 flex-1">{feature}</Text>
            </View>
          ))}
        </View>

        {isCurrentPlan ? (
          <Button variant="secondary" disabled className="w-full">
            Current Plan
          </Button>
        ) : (
          <Button
            variant={isBestValue ? 'accent' : 'primary'}
            onPress={() => handlePurchase(planKey)}
            disabled={loading}
            className="w-full"
          >
            {loading && selectedPlan === planKey ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              'Choose Plan'
            )}
          </Button>
        )}
      </Card>
    );

    if (Platform.OS === 'web') {
      return (
        <motion.div
          whileHover={{ y: -5 }}
          transition={{ duration: 0.2 }}
        >
          {cardContent}
        </motion.div>
      );
    }

    return cardContent;
  };

  const content = (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="px-6 py-8">
        <View className="text-center mb-8">
          <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Unlock Premium Features
          </Text>
          <Text className="text-lg text-gray-600 dark:text-gray-400">
            Choose the plan that works best for you
          </Text>
        </View>

        {/* Current Status */}
        {subscriptionStatus.tier === 'pro' && (
          <Card className="mb-6 p-4 bg-green-50 border border-green-200">
            <Text className="text-green-800 font-semibold">
              You're a Pro subscriber! {subscriptionStatus.type === 'lifetime' ? 
                'Lifetime access' : `Active until ${subscriptionStatus.endDate?.toLocaleDateString()}`}
            </Text>
          </Card>
        )}

        {/* Pricing Plans */}
        <View className="space-y-4 mb-8">
          <PlanCard 
            plan={pricing.monthly} 
            planKey="monthly"
            isCurrentPlan={subscriptionStatus.tier === 'pro' && subscriptionStatus.type === 'monthly'}
          />
          
          <PlanCard 
            plan={pricing.yearly} 
            planKey="yearly"
            isCurrentPlan={subscriptionStatus.tier === 'pro' && subscriptionStatus.type === 'yearly'}
          />
          
          <PlanCard 
            plan={pricing.lifetime} 
            planKey="lifetime"
            isCurrentPlan={subscriptionStatus.tier === 'pro' && subscriptionStatus.type === 'lifetime'}
            isBestValue
          />
        </View>

        {/* Free Plan Info */}
        <Card className="p-6 mb-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Free Plan Includes:
          </Text>
          <View className="space-y-2">
            <View className="flex-row items-center">
              <Text className="text-gray-500 mr-2">•</Text>
              <Text className="text-gray-700 dark:text-gray-300">3 invoices per month</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-gray-500 mr-2">•</Text>
              <Text className="text-gray-700 dark:text-gray-300">1 basic template</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-gray-500 mr-2">•</Text>
              <Text className="text-gray-700 dark:text-gray-300">PDF export with watermark</Text>
            </View>
          </View>
        </Card>

        {/* Restore Purchases */}
        {Platform.OS === 'android' && (
          <Button
            variant="outline"
            onPress={handleRestorePurchases}
            disabled={loading}
            className="w-full mb-4"
          >
            {loading ? (
              <ActivityIndicator color="#1e40af" size="small" />
            ) : (
              'Restore Purchases'
            )}
          </Button>
        )}

        {/* Terms */}
        <Text className="text-sm text-gray-500 text-center">
          By purchasing, you agree to our Terms of Service and Privacy Policy.
          Subscriptions auto-renew unless cancelled.
        </Text>
      </View>
    </ScrollView>
  );

  return content;
};

export default SubscriptionScreen;