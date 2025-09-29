import React, { useState, useEffect } from 'react';
import {
  getBusinessName,
  getBusinessEmail,
  getBusinessPhone,
  getBusinessAddress,
  setBusinessInfo
} from '../store/settings';

export default function BusinessInfoSection() {
  const [formData, setFormData] = useState({
    business_name: '',
    business_email: '',
    business_phone: '',
    business_address: ''
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  // Load existing business info on mount
  useEffect(() => {
    setFormData({
      business_name: getBusinessName() || '',
      business_email: getBusinessEmail() || '',
      business_phone: getBusinessPhone() || '',
      business_address: getBusinessAddress() || ''
    });
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
    setSavedMessage(false);
  };

  const handleSave = () => {
    setBusinessInfo(formData);
    setHasChanges(false);
    setSavedMessage(true);

    // Hide saved message after 2 seconds
    setTimeout(() => {
      setSavedMessage(false);
    }, 2000);
  };

  // Auto-save on blur if there are changes
  const handleBlur = () => {
    if (hasChanges) {
      handleSave();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium text-gray-900 dark:text-white">
          Business Information
        </h3>
        {savedMessage && (
          <span className="text-sm text-green-600 dark:text-green-400 animate-fade-in">
            ✓ Saved
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Business Name */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Business Name
          </label>
          <input
            type="text"
            value={formData.business_name}
            onChange={(e) => handleInputChange('business_name', e.target.value)}
            onBlur={handleBlur}
            placeholder="Your Business Name"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            This will appear on all your invoices
          </p>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            type="email"
            value={formData.business_email}
            onChange={(e) => handleInputChange('business_email', e.target.value)}
            onBlur={handleBlur}
            placeholder="business@example.com"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone
          </label>
          <input
            type="tel"
            value={formData.business_phone}
            onChange={(e) => handleInputChange('business_phone', e.target.value)}
            onBlur={handleBlur}
            placeholder="(555) 123-4567"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        {/* Address */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Address
          </label>
          <textarea
            value={formData.business_address}
            onChange={(e) => handleInputChange('business_address', e.target.value)}
            onBlur={handleBlur}
            placeholder="123 Business St, City, State 12345"
            rows="2"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
          />
        </div>
      </div>

      {/* Save Button (visible only when there are changes) */}
      {hasChanges && (
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}