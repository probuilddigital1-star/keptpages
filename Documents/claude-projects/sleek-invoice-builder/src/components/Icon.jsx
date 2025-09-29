import React from 'react';
import { Platform } from '../utils/platformComponents';
import { 
  FiFileText, FiPlus, FiEdit3, FiTrash2, FiEye, FiDownload, 
  FiMail, FiSearch, FiTrendingUp, FiCheck, FiX, FiAlertCircle,
  FiDollarSign, FiCalendar, FiClock, FiUsers, FiSettings,
  FiPrinter, FiShare2, FiCopy, FiFilter, FiGrid, FiList,
  FiChevronDown, FiChevronUp, FiChevronLeft, FiChevronRight,
  FiPaperclip, FiImage, FiUpload, FiRefreshCw, FiLock,
  FiUnlock, FiStar, FiZap, FiGift, FiAward, FiPackage,
  FiBarChart2, FiPieChart, FiActivity, FiCreditCard
} from 'react-icons/fi';
import { 
  HiOutlineDocumentText, HiOutlineDocumentDuplicate,
  HiOutlineCash, HiOutlineReceiptTax, HiOutlineChartBar,
  HiOutlineTemplate, HiOutlineCog, HiOutlineUserGroup
} from 'react-icons/hi';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

// Professional icon mapping system
const iconMap = {
  // Document icons
  invoice: Platform.OS === 'web' ? FiFileText : 'document-text-outline',
  receipt: Platform.OS === 'web' ? HiOutlineReceiptTax : 'receipt-outline',
  document: Platform.OS === 'web' ? HiOutlineDocumentText : 'document-outline',
  template: Platform.OS === 'web' ? HiOutlineTemplate : 'albums-outline',
  
  // Action icons
  add: Platform.OS === 'web' ? FiPlus : 'add',
  edit: Platform.OS === 'web' ? FiEdit3 : 'create-outline',
  delete: Platform.OS === 'web' ? FiTrash2 : 'trash-outline',
  view: Platform.OS === 'web' ? FiEye : 'eye-outline',
  download: Platform.OS === 'web' ? FiDownload : 'download-outline',
  upload: Platform.OS === 'web' ? FiUpload : 'cloud-upload-outline',
  share: Platform.OS === 'web' ? FiShare2 : 'share-outline',
  copy: Platform.OS === 'web' ? FiCopy : 'copy-outline',
  print: Platform.OS === 'web' ? FiPrinter : 'print-outline',
  refresh: Platform.OS === 'web' ? FiRefreshCw : 'refresh-outline',
  
  // Status icons
  success: Platform.OS === 'web' ? FiCheck : 'checkmark-circle-outline',
  error: Platform.OS === 'web' ? FiX : 'close-circle-outline',
  warning: Platform.OS === 'web' ? FiAlertCircle : 'warning-outline',
  info: Platform.OS === 'web' ? FiAlertCircle : 'information-circle-outline',
  
  // Business icons
  money: Platform.OS === 'web' ? FiDollarSign : 'cash-outline',
  revenue: Platform.OS === 'web' ? HiOutlineCash : 'cash-outline',
  analytics: Platform.OS === 'web' ? FiBarChart2 : 'bar-chart-outline',
  chart: Platform.OS === 'web' ? FiPieChart : 'pie-chart-outline',
  trending: Platform.OS === 'web' ? FiTrendingUp : 'trending-up-outline',
  activity: Platform.OS === 'web' ? FiActivity : 'pulse-outline',
  payment: Platform.OS === 'web' ? FiCreditCard : 'card-outline',
  
  // UI icons
  search: Platform.OS === 'web' ? FiSearch : 'search-outline',
  filter: Platform.OS === 'web' ? FiFilter : 'filter-outline',
  settings: Platform.OS === 'web' ? FiSettings : 'settings-outline',
  calendar: Platform.OS === 'web' ? FiCalendar : 'calendar-outline',
  clock: Platform.OS === 'web' ? FiClock : 'time-outline',
  users: Platform.OS === 'web' ? FiUsers : 'people-outline',
  
  // Navigation icons
  chevronDown: Platform.OS === 'web' ? FiChevronDown : 'chevron-down-outline',
  chevronUp: Platform.OS === 'web' ? FiChevronUp : 'chevron-up-outline',
  chevronLeft: Platform.OS === 'web' ? FiChevronLeft : 'chevron-back-outline',
  chevronRight: Platform.OS === 'web' ? FiChevronRight : 'chevron-forward-outline',
  
  // Premium icons
  premium: Platform.OS === 'web' ? FiStar : 'star-outline',
  pro: Platform.OS === 'web' ? FiZap : 'flash-outline',
  gift: Platform.OS === 'web' ? FiGift : 'gift-outline',
  award: Platform.OS === 'web' ? FiAward : 'trophy-outline',
  lock: Platform.OS === 'web' ? FiLock : 'lock-closed-outline',
  unlock: Platform.OS === 'web' ? FiUnlock : 'lock-open-outline',
  
  // Misc icons
  attachment: Platform.OS === 'web' ? FiPaperclip : 'attach-outline',
  image: Platform.OS === 'web' ? FiImage : 'image-outline',
  mail: Platform.OS === 'web' ? FiMail : 'mail-outline',
  grid: Platform.OS === 'web' ? FiGrid : 'grid-outline',
  list: Platform.OS === 'web' ? FiList : 'list-outline',
  package: Platform.OS === 'web' ? FiPackage : 'cube-outline'
};

const Icon = ({ name, size = 20, color = 'currentColor', className = '', style = {} }) => {
  const IconComponent = iconMap[name];
  
  if (!IconComponent) {
    // console.warn(`Icon "${name}" not found in icon map`);
    return null;
  }
  
  if (Platform.OS === 'web') {
    const WebIcon = IconComponent;
    return (
      <WebIcon 
        size={size} 
        color={color} 
        className={`inline-flex ${className}`}
        style={style}
      />
    );
  }
  
  // For React Native, use Ionicons
  return (
    <Ionicons 
      name={IconComponent} 
      size={size} 
      color={color}
      style={style}
    />
  );
};

// Professional icon sizes
export const IconSizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  xxl: 48
};

// Professional icon colors (matches our design system)
export const IconColors = {
  primary: '#2563eb',
  secondary: '#64748b',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  dark: '#1f2937',
  light: '#f3f4f6',
  white: '#ffffff',
  muted: '#9ca3af'
};

export default Icon;