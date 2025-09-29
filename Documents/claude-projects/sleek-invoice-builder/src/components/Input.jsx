import React from 'react';
import { TextInput, View, Text, Platform } from '../utils/platformComponents';

const Input = ({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  type = 'text', 
  error = '', 
  helperText = '',
  className = '',
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  editable = true,
  ...props 
}) => {
  const inputClasses = `rounded-lg px-4 py-3 text-base border ${
    error ? 'border-status-error focus:ring-status-error' : 'border-neutral-border focus:border-primary focus:ring-primary'
  } bg-white text-neutral-text transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-20 ${
    !editable ? 'opacity-50 bg-neutral-surface' : 'hover:border-primary-light'
  } ${className}`;

  if (Platform.OS === 'web') {
    return (
      <div className="mb-4">
        {label && <label className="block text-sm font-medium mb-2 text-primary-dark">{label}</label>}
        <input
          type={secureTextEntry ? 'password' : type}
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={placeholder}
          disabled={!editable}
          className={inputClasses}
          {...props}
        />
        {helperText && !error && <p className="mt-2 text-sm text-neutral-textSecondary">{helperText}</p>}
        {error && <p className="mt-2 text-sm text-status-error font-medium">{error}</p>}
      </div>
    );
  }

  return (
    <View className="mb-4">
      {label && <Text className="text-sm font-medium mb-2 text-primary-dark">{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#98A2B3"
        secureTextEntry={secureTextEntry || type === 'password'}
        keyboardType={keyboardType !== 'default' ? keyboardType : type === 'email' ? 'email-address' : type === 'number' ? 'numeric' : 'default'}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        editable={editable}
        className={inputClasses}
        {...props}
      />
      {helperText && !error && <Text className="mt-2 text-sm text-neutral-textSecondary">{helperText}</Text>}
      {error && <Text className="mt-2 text-sm text-status-error font-medium">{error}</Text>}
    </View>
  );
};

export default Input;