import { useState, useEffect } from 'react';
import Button from './ui/Button';
import { getSettings, saveSettings } from '../store/settings';
import { logInfo } from '../utils/errorHandler';
import { updateAllInvoicesWithPaymentMethods } from '../store/invoices.firebase';
import { USE_FIREBASE } from '../config/features';

export default function PaymentMethodsSection() {
  const [paymentMethods, setPaymentMethods] = useState({
    paypalEmail: '',
    venmoHandle: '',
    zelleEmail: '',
    cashappHandle: '',
    bankName: '',
    bankAccount: '',
    bankRouting: ''
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

  // Load existing payment methods
  useEffect(() => {
    const settings = getSettings();
    console.log('PaymentMethodsSection - Loading settings:', JSON.stringify(settings, null, 2));
    console.log('PaymentMethodsSection - Payment methods from settings:', JSON.stringify(settings.paymentMethods, null, 2));
    if (settings.paymentMethods) {
      setPaymentMethods(settings.paymentMethods);
    }
  }, []);

  const handleChange = (field, value) => {
    setPaymentMethods(prev => ({
      ...prev,
      [field]: value
    }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaving(true);

    // Debug logging
    console.log('PaymentMethodsSection - Saving payment methods:', JSON.stringify(paymentMethods, null, 2));

    // Get current settings and update payment methods
    const currentSettings = getSettings();
    const updatedSettings = {
      ...currentSettings,
      paymentMethods
    };

    console.log('PaymentMethodsSection - Updated settings:', JSON.stringify(updatedSettings, null, 2));

    saveSettings(updatedSettings);
    logInfo('PaymentMethods', 'Payment methods saved successfully');

    // Verify save
    const verifySettings = getSettings();
    console.log('PaymentMethodsSection - Verification after save:', JSON.stringify(verifySettings.paymentMethods, null, 2));

    setSaved(true);
    setSaving(false);

    // Reset saved message after 3 seconds
    setTimeout(() => setSaved(false), 3000);
  };

  const hasAnyMethod = () => {
    return paymentMethods.paypalEmail ||
           paymentMethods.venmoHandle ||
           paymentMethods.zelleEmail ||
           paymentMethods.cashappHandle ||
           paymentMethods.bankAccount;
  };

  const handleUpdateAllInvoices = async () => {
    setUpdating(true);
    setUpdateMessage('');

    try {
      // Save payment methods first
      const currentSettings = getSettings();
      const updatedSettings = {
        ...currentSettings,
        paymentMethods
      };
      saveSettings(updatedSettings);

      // Update all invoices with payment methods
      if (USE_FIREBASE) {
        await updateAllInvoicesWithPaymentMethods(paymentMethods);
        setUpdateMessage('✓ All invoices updated successfully!');
      } else {
        // For local storage version
        const { updateAllInvoicesWithPaymentMethods: localUpdate } = await import('../store/invoices');
        await localUpdate(paymentMethods);
        setUpdateMessage('✓ All invoices updated successfully!');
      }

      logInfo('PaymentMethods', 'All invoices updated with payment methods');

      // Clear message after 3 seconds
      setTimeout(() => setUpdateMessage(''), 3000);
    } catch (error) {
      console.error('Error updating invoices:', error);
      setUpdateMessage('✗ Error updating invoices. Please try again.');
      setTimeout(() => setUpdateMessage(''), 5000);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Payment Methods</h2>
        {saved && (
          <span className="text-sm text-green-600 dark:text-green-400">
            ✓ Saved
          </span>
        )}
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Configure payment methods that customers can use to pay invoices.
        Only configured methods will be shown to customers.
      </p>

      {!hasAnyMethod() && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ No payment methods configured. Customers won't be able to see payment options.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* PayPal */}
        <div>
          <label className="block text-sm font-medium mb-2">
            PayPal Email or Username
          </label>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">PP</span>
            </div>
            <input
              type="text"
              value={paymentMethods.paypalEmail}
              onChange={(e) => handleChange('paypalEmail', e.target.value)}
              placeholder="your-paypal@email.com or username"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-12">
            Enter your PayPal email or PayPal.me username
          </p>
        </div>

        {/* Venmo */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Venmo Handle
          </label>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-cyan-600 dark:text-cyan-400 font-bold text-xs">V</span>
            </div>
            <input
              type="text"
              value={paymentMethods.venmoHandle}
              onChange={(e) => handleChange('venmoHandle', e.target.value)}
              placeholder="@your-venmo"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-12">
            Your Venmo username (with or without @)
          </p>
        </div>

        {/* Zelle */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Zelle Email or Phone
          </label>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-purple-600 dark:text-purple-400 font-bold text-xs">Z</span>
            </div>
            <input
              type="text"
              value={paymentMethods.zelleEmail}
              onChange={(e) => handleChange('zelleEmail', e.target.value)}
              placeholder="email@example.com or (555) 123-4567"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-12">
            Email or phone number registered with Zelle
          </p>
        </div>

        {/* Cash App */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Cash App Handle
          </label>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-green-600 dark:text-green-400 font-bold">$</span>
            </div>
            <input
              type="text"
              value={paymentMethods.cashappHandle}
              onChange={(e) => handleChange('cashappHandle', e.target.value)}
              placeholder="$yourcashtag"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-12">
            Your Cash App $cashtag (with or without $)
          </p>
        </div>

        {/* Bank Transfer (Optional) */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium mb-2">
            Bank Transfer (Optional)
          </label>
          <div className="space-y-3 pl-12">
            <input
              type="text"
              value={paymentMethods.bankName}
              onChange={(e) => handleChange('bankName', e.target.value)}
              placeholder="Bank name (e.g., Chase, Wells Fargo)"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={paymentMethods.bankAccount}
              onChange={(e) => handleChange('bankAccount', e.target.value)}
              placeholder="Full account number"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={paymentMethods.bankRouting}
              onChange={(e) => handleChange('bankRouting', e.target.value)}
              placeholder="Routing number (optional)"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-12">
            Full account number required for bank transfers
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            onClick={handleUpdateAllInvoices}
            disabled={updating || !hasAnyMethod()}
            loading={updating}
            className="text-sm"
          >
            {updating ? 'Updating...' : 'Update All Invoices'}
          </Button>
          {updateMessage && (
            <span className={`text-sm ${updateMessage.includes('✓') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {updateMessage}
            </span>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
            Click to update all existing invoices with these payment methods
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving}
          loading={saving}
        >
          {saving ? 'Saving...' : 'Save Payment Methods'}
        </Button>
      </div>
    </section>
  );
}