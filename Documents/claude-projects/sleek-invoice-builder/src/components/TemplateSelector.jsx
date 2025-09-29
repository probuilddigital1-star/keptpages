import React, { useState } from 'react';
import { View, Text, ScrollView, Platform, TouchableOpacity, Image } from '../utils/platformComponents';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { getAvailableTemplates, TEMPLATES } from '../templates/frontend';
import Button from './Button';
import Card from './Card';
import FeatureGate, { PremiumBadge } from './FeatureGate';

const TemplateSelector = ({ selectedTemplate, onSelectTemplate, onClose }) => {
  const { isPremium } = useAuth();
  const availableTemplates = getAvailableTemplates(isPremium() ? 'pro' : 'free');
  const [hoveredTemplate, setHoveredTemplate] = useState(null);

  const TemplateCard = ({ template, isSelected = false }) => {
    const isPro = template.tier === 'pro';
    const canAccess = isPremium() || !isPro;

    const cardContent = (
      <Card 
        className={`p-4 cursor-pointer transition-all duration-200 ${
          isSelected ? 'border-2 border-primary bg-primary-50' : 'hover:shadow-medium'
        } ${!canAccess ? 'opacity-60' : ''}`}
        shadow={isSelected ? 'premium' : 'soft'}
      >
        <View className="relative">
          {/* Template Preview */}
          <View className="aspect-[4/5] bg-gray-100 rounded-lg mb-3 overflow-hidden">
            <View className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <svg className="w-12 h-12 opacity-30" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
              </svg>
            </View>
            {isPro && !isPremium() && (
              <View className="absolute top-2 right-2">
                <View className="bg-accent-primary px-2 py-1 rounded-full">
                  <Text className="text-xs font-bold text-gray-900">PRO</Text>
                </View>
              </View>
            )}
          </View>

          {/* Template Info */}
          <View>
            <Text className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              {template.name}
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {template.description}
            </Text>

            {/* Features */}
            <View className="space-y-1 mb-4">
              {template.id === 'basic' && (
                <>
                  <Text className="text-xs text-gray-500">• Simple layout</Text>
                  <Text className="text-xs text-gray-500">• Clean typography</Text>
                  <Text className="text-xs text-gray-500">• PDF with watermark</Text>
                </>
              )}
              {template.id === 'corporate' && (
                <>
                  <Text className="text-xs text-gray-500">• Professional gradient header</Text>
                  <Text className="text-xs text-gray-500">• Executive typography</Text>
                  <Text className="text-xs text-gray-500">• Premium styling</Text>
                </>
              )}
              {template.id === 'creative' && (
                <>
                  <Text className="text-xs text-gray-500">• Modern colorful design</Text>
                  <Text className="text-xs text-gray-500">• Creative elements</Text>
                  <Text className="text-xs text-gray-500">• Interactive layout</Text>
                </>
              )}
              {template.id === 'traditional' && (
                <>
                  <Text className="text-xs text-gray-500">• Classic formal layout</Text>
                  <Text className="text-xs text-gray-500">• Traditional typography</Text>
                  <Text className="text-xs text-gray-500">• Business professional</Text>
                </>
              )}
            </View>

            {/* Selection Button */}
            {canAccess ? (
              <Button
                variant={isSelected ? 'accent' : 'outline'}
                onPress={() => onSelectTemplate(template.id)}
                className="w-full"
              >
                {isSelected ? 'Selected' : 'Use Template'}
              </Button>
            ) : (
              <FeatureGate 
                feature="premium-templates" 
                showUpgradePrompt={false}
                fallback={
                  <Button variant="outline" disabled className="w-full">
                    Requires Pro
                  </Button>
                }
              />
            )}
          </View>
        </View>
      </Card>
    );

    if (Platform.OS === 'web') {
      return (
        <motion.div
          whileHover={{ y: canAccess ? -5 : 0 }}
          onHoverStart={() => setHoveredTemplate(template.id)}
          onHoverEnd={() => setHoveredTemplate(null)}
          transition={{ duration: 0.2 }}
        >
          {cardContent}
        </motion.div>
      );
    }

    return (
      <TouchableOpacity 
        onPress={canAccess ? () => onSelectTemplate(template.id) : undefined}
        disabled={!canAccess}
      >
        {cardContent}
      </TouchableOpacity>
    );
  };

  const content = (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="px-6 py-8 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            Choose Invoice Template
          </Text>
          {onClose && (
            <Button variant="outline" onPress={onClose}>
              Close
            </Button>
          )}
        </View>
        <Text className="text-gray-600 dark:text-gray-400">
          Select a professional template for your invoice. {!isPremium() && 'Upgrade to Pro to unlock premium templates.'}
        </Text>
      </View>

      {/* Templates Grid */}
      <ScrollView className="flex-1 px-6 py-8">
        <View className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableTemplates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={selectedTemplate === template.id}
            />
          ))}
        </View>

        {/* Premium Upsell */}
        {!isPremium() && (
          <View className="mt-8">
            <FeatureGate feature="premium-templates" />
          </View>
        )}
      </ScrollView>
    </View>
  );

  return content;
};

export default TemplateSelector;