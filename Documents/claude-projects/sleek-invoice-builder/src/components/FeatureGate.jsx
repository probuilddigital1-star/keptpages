import React from 'react';
import { View, Text, Platform } from '../utils/platformComponents';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import Button from './Button';
import Card from './Card';
import { FiAward, FiZap } from 'react-icons/fi';

const FeatureGate = ({ 
  feature, 
  children, 
  fallback = null, 
  showUpgradePrompt = true,
  customMessage = null 
}) => {
  const { isPremium, canCreateInvoice, canUseTemplates, getRemainingFreeInvoices } = useAuth();

  // Check if user has access to the feature
  const hasAccess = () => {
    if (isPremium()) return true;

    switch (feature) {
      case 'unlimited-invoices':
        return canCreateInvoice();
      case 'premium-templates':
        return canUseTemplates();
      case 'analytics':
      case 'export-csv':
      case 'client-management':
      case 'recurring-invoices':
      case 'remove-watermark':
      case 'priority-support':
        return false;
      default:
        return true;
    }
  };

  const getFeatureMessage = () => {
    if (customMessage) return customMessage;

    switch (feature) {
      case 'unlimited-invoices':
        const remaining = getRemainingFreeInvoices();
        if (remaining === 0) {
          return "You've reached your free invoice limit this month. Upgrade to Pro for unlimited invoices!";
        }
        return `You have ${remaining} free invoice${remaining !== 1 ? 's' : ''} remaining this month.`;
      case 'premium-templates':
        return "Unlock 10+ professional invoice templates with Pro!";
      case 'analytics':
        return "Get insights into your business with Pro analytics!";
      case 'export-csv':
        return "Export your data to CSV/Excel with Pro!";
      case 'client-management':
        return "Manage your clients efficiently with Pro!";
      case 'recurring-invoices':
        return "Automate recurring invoices with Pro!";
      case 'remove-watermark':
        return "Remove watermarks from PDFs with Pro!";
      case 'priority-support':
        return "Get priority support with Pro!";
      default:
        return "Upgrade to Pro to unlock this feature!";
    }
  };

  if (hasAccess()) {
    return children;
  }

  if (!showUpgradePrompt && fallback) {
    return fallback;
  }

  const upgradeContent = (
    <Card className="p-6 text-center bg-gradient-to-br from-primary-50 to-accent-50 border-2 border-primary-200">
      <View className="mb-4">
        <FiAward className="text-3xl mb-2 text-primary mx-auto" />
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Premium Feature
        </Text>
        <Text className="text-gray-600 dark:text-gray-400">
          {getFeatureMessage()}
        </Text>
      </View>
      
      <View className="space-y-2">
        <Button 
          variant="primary" 
          onPress={() => {
            // Navigate to subscription screen
            // This will be implemented when we add the subscription screen
          }}
          className="w-full"
        >
          Upgrade to Pro - $4.99/month
        </Button>
        <Text className="text-sm text-gray-500 mt-2">
          or $99.99 lifetime
        </Text>
      </View>

      {feature === 'unlimited-invoices' && getRemainingFreeInvoices() > 0 && (
        <View className="mt-4 p-3 bg-yellow-50 rounded-lg">
          <Text className="text-sm text-yellow-800 flex items-center gap-2">
            <FiZap className="text-yellow-600" /> Tip: You still have {getRemainingFreeInvoices()} free invoices this month
          </Text>
        </View>
      )}
    </Card>
  );

  if (Platform.OS === 'web') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {upgradeContent}
      </motion.div>
    );
  }

  return upgradeContent;
};

// Helper component for inline feature gates (e.g., buttons, small features)
export const PremiumBadge = ({ feature, children, className = '' }) => {
  const { isPremium } = useAuth();
  
  if (isPremium()) {
    return children;
  }

  return (
    <View className={`relative ${className}`}>
      {children}
      <View className="absolute -top-2 -right-2 bg-accent-primary px-2 py-1 rounded-full">
        <Text className="text-xs font-bold text-gray-900">PRO</Text>
      </View>
    </View>
  );
};

export default FeatureGate;