import { logError, logInfo } from './utils/errorHandler';
import React, { useState, createContext, useContext, useEffect } from 'react';
import './index.css';
import PaymentButton from './components/PaymentButton';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import InvoiceTemplates, { TemplateSelector } from './components/InvoiceTemplates';
import paypalService from './services/paypalService';
import storageService from './services/storageService';
import PDFService from './services/pdfService';
import DashboardPremium from './components/DashboardPremium';

// Mock Auth Context for testing watermark
const AuthContext = createContext();

// Mock auth provider
const MockAuthProvider = ({ children, isPremium }) => {
  const authValue = {
    isPremium: () => isPremium,
    user: { email: 'demo@example.com' }
  };
  
  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Mock useAuth hook for Watermark component
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Provide a default for when not wrapped in provider
    return { isPremium: () => false };
  }
  return context;
};

// Demo Watermark Component (inline to avoid import issues)
const Watermark = ({ children, className = '' }) => {
  const { isPremium } = useAuth();
  
  // Don't show watermark for premium users
  if (isPremium && isPremium()) {
    return <>{children}</>;
  }

  // Web version watermark
  return (
    <div className={`relative ${className}`}>
      {children}
      <div 
        className="watermark-container absolute bottom-2 right-2 md:bottom-4 md:right-4 opacity-50 pointer-events-none select-none z-10"
        style={{
          fontSize: '12px',
          fontWeight: '500',
          color: '#6b7280',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '6px 10px',
          borderRadius: '8px',
          border: '1px solid rgba(107, 114, 128, 0.2)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          maxWidth: '180px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: '600', color: '#4b5563', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Created with Sleek Invoice
            </div>
            <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Upgrade to Pro to remove
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Production-accurate demo showing the real app styling
const ProductionDemo = () => {
  const [view, setView] = useState('dashboard');
  const [isPremiumUser, setIsPremiumUser] = useState(false); // Toggle for testing
  const [invoices, setInvoices] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paypalEmail, setPaypalEmail] = useState(''); // Store PayPal email
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' or 'analytics'
  const [selectedTemplate, setSelectedTemplate] = useState('modern'); // Selected invoice template

  // Load saved data on mount
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        // Load saved invoices
        const savedInvoices = await storageService.loadInvoices();
        if (savedInvoices && savedInvoices.length > 0) {
          setInvoices(savedInvoices);
        } else {
          // Use demo data if no saved invoices
          const demoInvoices = [
            { 
              id: 1001, 
              client_name: 'Acme Corporation', 
              client_email: 'billing@acme.com',
              total: 5280.00,
              status: 'paid',
              paymentStatus: 'completed',
              paymentMethod: 'paypal',
              date: '2024-01-15',
              items: [
                { description: 'Website Development', quantity: 1, price: 3500 },
                { description: 'Monthly Maintenance', quantity: 3, price: 450 },
                { description: 'Logo Design', quantity: 1, price: 430 }
              ]
            },
            { 
              id: 1002, 
              client_name: 'TechStart Inc.', 
              client_email: 'accounts@techstart.io',
              total: 2150.50,
              status: 'sent',
              paymentStatus: 'pending',
              paymentMethod: null,
              date: '2024-01-18',
              items: [
                { description: 'Consulting Services', quantity: 8, price: 225 },
                { description: 'Travel Expenses', quantity: 1, price: 350.50 }
              ]
            }
          ];
          setInvoices(demoInvoices);
          await storageService.saveInvoices(demoInvoices);
        }
      } catch (error) {
        logError('ProductionDemo.loading', error);
      } finally {
        setIsLoadingData(false);
      }
    };
    
    loadSavedData();
    
    // Initialize PayPal service
    paypalService.setBusinessEmail('yourbusiness');
  }, []);
  
  // Save invoices whenever they change
  useEffect(() => {
    if (!isLoadingData && invoices.length > 0) {
      storageService.saveInvoices(invoices);
    }
  }, [invoices, isLoadingData]);

  // Use the new Premium Dashboard
  const Dashboard = () => (
    <DashboardPremium 
      invoices={invoices}
      onCreateInvoice={() => setView('create')}
      onSelectInvoice={(invoice) => {
        setSelectedInvoice(invoice);
        setView('preview');
      }}
      isPremiumUser={isPremiumUser}
    />

  );

  // Production-style Invoice Form matching InvoiceForm.enhanced.jsx
  const CreateInvoice = () => {
    const auth = useAuth();
    const isPremium = auth.isPremium && auth.isPremium();
    
    // Calculate free user limitations
    const FREE_INVOICE_LIMIT = 3;
    const currentInvoiceCount = invoices.length;
    const remainingInvoices = Math.max(0, FREE_INVOICE_LIMIT - currentInvoiceCount);
    const [businessType, setBusinessType] = useState('service'); // New business type state
    const [formData, setFormData] = useState({
      client_name: '',
      client_email: '',
      items: [{ description: '', quantity: '', price: '' }], // Empty strings for all numeric fields
      logo_url: '',
      business_name: '',
      business_email: '',
      business_phone: ''
    });

    // Business type configurations
    const businessTypes = {
      service: { 
        fields: ['hours', 'rate'], 
        labels: { quantity: 'Hours', price: 'Hourly Rate' },
        placeholder: { quantity: '1', price: '150.00' }
      },
      product: { 
        fields: ['quantity', 'unitPrice'], 
        labels: { quantity: 'Qty', price: 'Unit Price' },
        placeholder: { quantity: '1', price: '99.99' }
      },
      project: { 
        fields: ['milestone', 'amount'], 
        labels: { quantity: 'Progress %', price: 'Amount' },
        placeholder: { quantity: '100', price: '5000.00' }
      }
    };
    
    const currentBusinessType = businessTypes[businessType];

    const handleItemChange = (index, field, value) => {
      const newItems = [...formData.items];
      newItems[index] = { ...newItems[index], [field]: value };
      setFormData(prev => ({ ...prev, items: newItems }));
    };

    const addItem = () => {
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, { description: '', quantity: '', price: '' }] // Empty strings for all numeric fields
      }));
    };

    const removeItem = (index) => {
      if (formData.items.length > 1) {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, items: newItems }));
      }
    };

    const calculateTotal = () => {
      return formData.items.reduce((sum, item) => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        return sum + (qty * price);
      }, 0);
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      
      // Check invoice creation limit for free users
      const FREE_INVOICE_LIMIT = 3;
      if (!isPremiumUser) {
        const currentMonthInvoices = invoices.filter(inv => {
          const invDate = new Date(inv.date);
          const now = new Date();
          return invDate.getMonth() === now.getMonth() && 
                 invDate.getFullYear() === now.getFullYear();
        });
        
        if (currentMonthInvoices.length >= FREE_INVOICE_LIMIT) {
          alert(`You've reached the free limit of ${FREE_INVOICE_LIMIT} invoices per month. Upgrade to Pro for unlimited invoices!`);
          return;
        }
      }
      
      const newInvoice = {
        id: Math.floor(1000 + Math.random() * 9000),
        ...formData,
        total: calculateTotal(),
        status: 'draft',
        date: new Date().toISOString().split('T')[0],
        hasWatermark: !isPremiumUser  // Add watermark flag for free users
      };
      const updatedInvoices = [...invoices, newInvoice];
      setInvoices(updatedInvoices);
      // Update analytics
      storageService.updateAnalytics(newInvoice);
      setView('dashboard');
    };

    return (
      <div className="min-h-screen bg-gradient-subtle p-6 animate-fade-in">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-xl font-bold text-primary-dark">
              Create Invoice
            </h1>
            <button
              onClick={() => setView('dashboard')}
              className="text-neutral-textSecondary hover:text-primary-dark text-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="card-premium p-8">
            {/* Business Type Selector */}
            <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <h3 className="text-lg font-semibold text-primary-dark mb-4">Business Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(businessTypes).map(([type, config]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setBusinessType(type)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      businessType === type
                        ? 'border-primary-600 bg-primary-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold capitalize text-primary-dark">{type} Business</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {type === 'service' ? 'Bill by hours' : type === 'product' ? 'Bill by quantity' : 'Bill by milestone'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Business Information */}
            <div className="mb-8 p-6 rounded-xl border border-gray-200 bg-white">
              <h3 className="text-lg font-semibold text-primary-dark mb-4">Business Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-primary-dark mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={formData.business_name}
                    onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                    className="input-premium w-full text-lg"
                    placeholder="Your Business Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-dark mb-2">
                    Business Email
                  </label>
                  <input
                    type="email"
                    value={formData.business_email}
                    onChange={(e) => setFormData({...formData, business_email: e.target.value})}
                    className="input-premium w-full text-lg"
                    placeholder="business@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Logo Upload Section */}
            <div className={`mb-8 p-6 rounded-xl border ${
              isPremium 
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                : 'bg-gray-50 border-gray-200 relative'
            }`}>
              <h3 className="text-lg font-semibold text-primary-dark mb-4">
                Company Logo {!isPremium && <span className="text-sm font-normal text-accent-primary ml-2">Pro Feature</span>}
              </h3>
              <div className="flex items-center gap-4">
                <label className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all cursor-pointer ${
                  isPremium
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:shadow-lg'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>{isPremium ? 'Upload Logo' : 'Locked'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={!isPremium}
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setFormData({...formData, logo_url: event.target.result});
                        };
                        reader.readAsDataURL(e.target.files[0]);
                      }
                    }}
                  />
                </label>
                <span className="text-sm text-neutral-textSecondary">
                  {isPremium ? 'Upload your company logo (PNG, JPG, max 2MB)' : 'Upgrade to Pro to add company logo'}
                </span>
              </div>
            </div>

            {/* Client Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-primary-dark mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                  className="input-premium w-full text-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-dark mb-2">
                  Client Email *
                </label>
                <input
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => setFormData({...formData, client_email: e.target.value})}
                  className="input-premium w-full text-lg"
                  required
                />
              </div>
            </div>

            {/* Items Section */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-primary-dark">Invoice Items</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="btn-premium text-sm py-2 px-4"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Item
                </button>
              </div>

              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="p-4 bg-neutral-surface rounded-xl border border-neutral-border">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          className="input-premium w-full"
                          placeholder="Service or product description"
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {currentBusinessType.labels.quantity}
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="input-premium w-full"
                          min="0.01"
                          step="any"
                          placeholder={currentBusinessType.placeholder.quantity}
                          required
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {currentBusinessType.labels.price}
                        </label>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                          className="input-premium w-full"
                          step="0.01"
                          min="0"
                          placeholder={currentBusinessType.placeholder.price}
                          required
                        />
                      </div>
                      <div className="md:col-span-1 flex items-end">
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="w-full p-2 text-status-error hover:bg-status-errorSoft rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center p-6 bg-accent-primary text-white rounded-xl mb-8">
              <span className="text-xl font-semibold text-white">Total Amount:</span>
              <span className="text-xl font-bold text-white">
                ${calculateTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Free User Limitations Notice */}
            {!isPremium && (
              <div className="mb-8 p-4 bg-status-warningSoft border border-status-warning/20 rounded-xl">
                <div className="flex items-start gap-4">
                  <svg className="w-5 h-5 text-status-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p className="font-medium text-status-warningDark">Free Account Limitations</p>
                    <ul className="text-sm text-neutral-textSecondary mt-1 space-y-1">
                      <li>• Maximum {FREE_INVOICE_LIMIT} invoices per month ({remainingInvoices} remaining)</li>
                      <li>• Watermark on all invoices</li>
                      <li>• Basic template only</li>
                    </ul>
                    <button 
                      type="button"
                      onClick={() => setIsPremiumUser(true)}
                      className="btn-upgrade-pro py-2 px-6 text-sm mt-3"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      UPGRADE TO PRO
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setView('dashboard')}
                className="btn-secondary px-6 py-3 rounded-lg font-medium border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-premium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                CREATE INVOICE
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Production-style Invoice Preview
  const InvoicePreview = () => {
    if (!selectedInvoice) return null;

    const currentTemplate = InvoiceTemplates[selectedTemplate];

    return (
      <div className="min-h-screen bg-gradient-subtle p-6 animate-fade-in">
        <div className="max-w-5xl mx-auto">
          {/* Premium Status Banner */}
          <div className={`mb-6 p-4 rounded-lg border ${
            isPremiumUser 
              ? 'bg-gradient-to-r from-accent-primary/10 to-accent-primaryLight/10 border-accent-primary/30' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <svg className="w-6 h-6 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isPremiumUser ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  )}
                </svg>
                <div>
                  <h3 className="font-semibold text-primary-dark">
                    {isPremiumUser ? 'Premium Account' : 'Free Account'}
                  </h3>
                  <p className="text-sm text-neutral-textSecondary">
                    {isPremiumUser 
                      ? 'Enjoy watermark-free invoices and premium features' 
                      : 'Upgrade to Pro to remove watermark and unlock all features'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPremiumUser(!isPremiumUser)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  isPremiumUser 
                    ? 'bg-white text-neutral-textSecondary hover:bg-gray-50' 
                    : 'bg-gradient-to-r from-accent-primary to-accent-primaryLight text-white hover:shadow-lg'
                }`}
              >
                {isPremiumUser ? 'Switch to Free' : 'Upgrade to Pro'}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center mb-8">
            <h1 className="text-xl font-bold text-primary-dark">
              Invoice #{selectedInvoice.id}
            </h1>
            <div className="flex gap-4">
              <button
                onClick={async () => {
                  try {
                    // Find the invoice preview element
                    const invoiceElement = document.querySelector('.invoice-preview');
                    if (invoiceElement) {
                      const result = await PDFService.generateFromElement('invoice-preview', `invoice-${selectedInvoice.id}.pdf`, isPremiumUser);
                      if (!result.success) {
                        alert('Error generating PDF: ' + (result.error || 'Unknown error'));
                      }
                    } else {
                      // Fallback to data generation
                      const result = PDFService.generateFromData(selectedInvoice, `invoice-${selectedInvoice.id}.pdf`, isPremiumUser);
                      if (!result.success) {
                        alert('Error generating PDF: ' + (result.error || 'Unknown error'));
                      }
                    }
                  } catch (error) {
                    logError('ProductionDemo.pdf', error);
                    alert('Failed to export PDF. Please try again.');
                  }
                }}
                className={isPremiumUser ? 'btn-premium py-3 px-6' : 'btn-secondary'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {isPremiumUser ? 'EXPORT PDF' : 'Export PDF (Watermark)'}
              </button>
              <button
                onClick={() => setView('dashboard')}
                className="btn-secondary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </button>
            </div>
          </div>

          {/* Template Selector */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-primary-dark mb-4">Select Invoice Template</h3>
            <TemplateSelector
              selectedTemplate={selectedTemplate}
              onSelectTemplate={setSelectedTemplate}
              isPremium={isPremiumUser}
            />
          </div>

          {/* Invoice Preview with Selected Template */}
          <div id="invoice-preview" className="invoice-preview mb-8">
            <Watermark>
              {currentTemplate && currentTemplate.render(selectedInvoice, isPremiumUser)}
            </Watermark>
          </div>

          {/* Payment Section */}
          <div className="mt-8">
            <PaymentButton 
              invoice={selectedInvoice}
              isPremium={isPremiumUser}
              onPaymentInitiated={(link) => {
                console.log('Payment initiated:', link);
                // Update invoice status
                const updatedInvoices = invoices.map(inv => 
                  inv.id === selectedInvoice.id 
                    ? { ...inv, paymentStatus: 'processing' }
                    : inv
                );
                setInvoices(updatedInvoices);
              }}
              showQRCode={true}
            />
          </div>
        </div>
      </div>
    );
  };

  // Render current view with auth provider
  return (
    <MockAuthProvider isPremium={isPremiumUser}>
      {view === 'dashboard' && <Dashboard />}
      {view === 'create' && <CreateInvoice />}
      {view === 'preview' && <InvoicePreview />}
    </MockAuthProvider>
  );
};

export default ProductionDemo;