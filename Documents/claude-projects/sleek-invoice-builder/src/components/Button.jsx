import React from 'react';
import { TouchableOpacity, Text, Platform } from '../utils/platformComponents';
import { motion } from 'framer-motion';
import { MotiView } from 'moti';

const Button = ({ onPress, children, variant = 'primary', className = '', disabled = false, size = 'medium', icon = null }) => {
  // Professional size system
  const sizeClasses = {
    small: 'px-4 py-2 min-h-[36px] text-sm',
    medium: 'px-6 py-3 min-h-[44px] text-base',
    large: 'px-8 py-4 min-h-[52px] text-lg'
  };
  
  const baseClasses = `rounded-lg flex items-center justify-center transition-all duration-200 font-semibold ${sizeClasses[size]}`;
  
  // Professional color system matching FreshBooks/QuickBooks quality
  const variantClasses = {
    primary: disabled 
      ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md active:bg-blue-800',
    secondary: disabled
      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300',
    accent: disabled
      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
      : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md hover:shadow-lg transform hover:scale-[1.02]',
    premium: disabled
      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
      : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md hover:shadow-lg transform hover:scale-[1.02]',
    outline: disabled
      ? 'border-2 border-gray-300 text-gray-400 cursor-not-allowed'
      : 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 active:bg-blue-100',
    danger: disabled
      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
      : 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md active:bg-red-800',
    success: disabled
      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
      : 'bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md active:bg-green-800'
  };
  
  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className}`;

  if (Platform.OS === 'web') {
    return (
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.01 }}
        whileTap={{ scale: disabled ? 1 : 0.99 }}
        onClick={disabled ? undefined : onPress}
        disabled={disabled}
        className={combinedClasses}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        {icon && <span className="mr-2">{icon}</span>}
        <span className="font-semibold">{children}</span>
      </motion.button>
    );
  }

  const AnimatedButton = () => (
    <MotiView
      from={{ scale: 1 }}
      animate={{ scale: 1 }}
      transition={{ type: 'timing', duration: 150 }}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <TouchableOpacity
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        className={combinedClasses}
        activeOpacity={disabled ? 1 : 0.8}
      >
        <Text className={`font-semibold ${
          variant === 'outline' && !disabled ? 'text-blue-600' : 
          variant === 'secondary' && !disabled ? 'text-gray-700' : 'text-white'
        }`}>
          {icon && <Text className="mr-2">{icon}</Text>}
          {children}
        </Text>
      </TouchableOpacity>
    </MotiView>
  );

  return <AnimatedButton />;
};

export default Button;