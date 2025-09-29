/**
 * Platform-specific component wrapper
 * Provides cross-platform compatibility for React Native components
 * that may have issues in web environments
 */

import { Platform } from 'react-native';

// Platform-specific TouchableOpacity import
let TouchableOpacity;
let View;
let Text;
let ScrollView;
let TextInput;
let Image;
let FlatList;
let ActivityIndicator;
let Modal;
let KeyboardAvoidingView;
let Button;

if (Platform.OS === 'web') {
  // For web, we'll use react-native-web components
  // or fallback to custom implementations
  try {
    const RN = require('react-native');
    TouchableOpacity = RN.TouchableOpacity || RN.Pressable || RN.View;
    View = RN.View;
    Text = RN.Text;
    ScrollView = RN.ScrollView;
    TextInput = RN.TextInput;
    Image = RN.Image;
    FlatList = RN.FlatList;
    ActivityIndicator = RN.ActivityIndicator;
    Modal = RN.Modal;
    KeyboardAvoidingView = RN.KeyboardAvoidingView;
    Button = RN.Button;
  } catch (error) {
    // Fallback for web if react-native-web is not available
    // console.warn('React Native Web components not available, using fallbacks');
    const RN = require('react-native');
    TouchableOpacity = RN.Pressable || RN.View;
    View = RN.View;
    Text = RN.Text;
    ScrollView = RN.ScrollView;
    TextInput = RN.TextInput;
    Image = RN.Image;
    FlatList = RN.FlatList;
    ActivityIndicator = RN.ActivityIndicator;
    Modal = RN.Modal;
    KeyboardAvoidingView = RN.KeyboardAvoidingView || RN.View;
    Button = RN.Button;
  }
} else {
  // For native platforms (iOS, Android)
  const RN = require('react-native');
  TouchableOpacity = RN.TouchableOpacity;
  View = RN.View;
  Text = RN.Text;
  ScrollView = RN.ScrollView;
  TextInput = RN.TextInput;
  Image = RN.Image;
  FlatList = RN.FlatList;
  ActivityIndicator = RN.ActivityIndicator;
  Modal = RN.Modal;
  KeyboardAvoidingView = RN.KeyboardAvoidingView;
  Button = RN.Button;
}

// Export all platform-specific components
export {
  TouchableOpacity,
  View,
  Text,
  ScrollView,
  TextInput,
  Image,
  FlatList,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Button,
  Platform
};

// Export default for convenience
export default {
  TouchableOpacity,
  View,
  Text,
  ScrollView,
  TextInput,
  Image,
  FlatList,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Button,
  Platform
};