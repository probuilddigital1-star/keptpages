import React from 'react';
import { View, Platform } from '../utils/platformComponents';

const Card = ({ 
  children, 
  className = '', 
  variant = 'static',
  onClick,
  disabled = false,
  selected = false,
  loading = false,
  ...props 
}) => {
  // Determine card type based on variant and props
  const getCardClasses = () => {
    if (loading) return 'card-loading';
    
    const variantClasses = {
      'static': 'card-static',
      'interactive': 'card-interactive',
      'stats': 'card-stats',
      'stats-success': 'card-stats card-stats-success',
      'stats-warning': 'card-stats card-stats-warning', 
      'stats-error': 'card-stats card-stats-error',
      'invoice': `card-invoice ${selected ? 'selected' : ''}`,
      'feature': 'card-feature',
      'elevated': 'card-elevated',
      'compact': 'card-compact',
      'premium': 'card-premium' // Legacy support
    };
    
    let baseClass = variantClasses[variant] || 'card-static';
    
    // Make interactive if onClick provided
    if (onClick && !disabled && variant === 'static') {
      baseClass = 'card-interactive';
    }
    
    return baseClass;
  };

  const cardClasses = `${getCardClasses()} ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`;

  const handleClick = (e) => {
    if (!disabled && onClick) {
      onClick(e);
    }
  };

  const handleKeyDown = (e) => {
    if (!disabled && onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(e);
    }
  };

  if (Platform.OS === 'web') {
    const Component = onClick && !disabled ? 'button' : 'div';
    
    return (
      <Component
        className={cardClasses}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        tabIndex={onClick && !disabled ? 0 : undefined}
        role={onClick && !disabled ? 'button' : undefined}
        aria-disabled={disabled}
        {...props}
      >
        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        ) : (
          children
        )}
      </Component>
    );
  }

  // Native implementation with proper shadow
  const getShadowStyle = () => {
    if (loading) return {};
    
    const shadowConfigs = {
      'static': { elevation: 2, shadowOpacity: 0.1, shadowRadius: 3 },
      'interactive': { elevation: 3, shadowOpacity: 0.12, shadowRadius: 4 },
      'stats': { elevation: 2, shadowOpacity: 0.1, shadowRadius: 3 },
      'invoice': { elevation: 3, shadowOpacity: 0.12, shadowRadius: 4 },
      'feature': { elevation: 4, shadowOpacity: 0.15, shadowRadius: 6 },
      'elevated': { elevation: 6, shadowOpacity: 0.18, shadowRadius: 8 },
      'compact': { elevation: 1, shadowOpacity: 0.08, shadowRadius: 2 },
    };
    
    const config = shadowConfigs[variant] || shadowConfigs.static;
    
    return {
      shadowColor: '#0B1426',
      shadowOffset: { width: 0, height: config.elevation },
      shadowOpacity: config.shadowOpacity,
      shadowRadius: config.shadowRadius,
      elevation: config.elevation,
    };
  };

  return (
    <View 
      className={cardClasses} 
      style={getShadowStyle()}
      onPress={handleClick}
      disabled={disabled}
      {...props}
    >
      {loading ? (
        <View className="animate-pulse space-y-3">
          <View className="h-4 bg-gray-200 rounded w-3/4" />
          <View className="h-4 bg-gray-200 rounded w-1/2" />
          <View className="h-4 bg-gray-200 rounded w-5/6" />
        </View>
      ) : (
        children
      )}
    </View>
  );
};

export default Card;