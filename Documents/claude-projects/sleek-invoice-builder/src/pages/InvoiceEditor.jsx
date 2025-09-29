import { useMemo, useState, useEffect, useRef } from 'react';
import { fmtMoney, toNumber } from '../utils/money';
import LineItemsTable from '../components/LineItemsTable';
import PageShell from '../components/PageShell';
import Toast from '../components/Toast';
import { genId, saveInvoice } from '../store/invoices';
import { canUse, limits, getInvoiceCountThisMonth, getSubscription, PRICING } from '../store/subscription';
import { listClients } from '../store/clients';
import { listItems } from '../store/items';
import { getBusinessName, getBusinessEmail, getBusinessPhone, getBusinessAddress, getSettings } from '../store/settings';
import UpgradeModal from '../components/UpgradeModal';
import Button from '../components/ui/Button';
import StickyBar from '../components/StickyBar';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/ui/useToast';
import { shouldShowKeyboardShortcuts } from '../utils/deviceDetection';
import { validateEmail, validateText, validateInvoiceNumber, validateAmount, validateDate, sanitizeObject } from '../utils/validation';
import { useAuth } from '../contexts/AuthContext';

export default function InvoiceEditor({ onCancel, onSave, initial, onLogoClick, onOpenClients, onOpenItems }) {
  const initData = initial || {};
  const { incrementInvoiceUsage, userProfile } = useAuth();
  const [client_name, setClientName] = useState(initData.client_name || '');
  const [client_email, setClientEmail] = useState(initData.client_email || '');
  const [client_address, setClientAddress] = useState(initData.client_address || '');
  const [payment_terms, setPaymentTerms] = useState(initData.payment_terms || initData.terms || 'Net 15');
  const [number, setNumber] = useState(initData.number || `INV-${Date.now().toString().slice(-6)}`);
  const [date, setDate] = useState(initData.date || new Date().toISOString().slice(0,10));
  const [items, setItems] = useState(initData.items || [{ title: '', description: '', qty: 1, rate: 0 }]);
  const [notes, setNotes] = useState(initData.notes || '');
  const [taxPct, setTaxPct] = useState(initData.taxPct || 0);
  const [discount, setDiscount] = useState(initData.discount || 0);
  const [errors, setErrors] = useState({});
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('info');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  
  // Get saved clients and items
  const [savedClients, setSavedClients] = useState([]);
  const [savedItems, setSavedItems] = useState([]);

  // Load saved clients and items
  useEffect(() => {
    const loadData = async () => {
      try {
        const [clients, items] = await Promise.all([
          listClients(),
          listItems()
        ]);
        setSavedClients(clients);
        setSavedItems(items);
      } catch (error) {
        console.warn('[InvoiceEditor] Failed to load saved clients/items:', error);
      }
    };
    loadData();
  }, []);

  // Check invoice limits for free tier
  const subscription = getSubscription();
  const currentLimits = limits();
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [countLoading, setCountLoading] = useState(true);
  const canCreateNew = canUse('unlimited') || invoiceCount < currentLimits.monthlyLimit;
  const isEditing = !!initData.id;

  // Load invoice count and update when userProfile changes
  useEffect(() => {
    const loadInvoiceCount = () => {
      try {
        // Get count from Firestore via subscription store
        const count = getInvoiceCountThisMonth();
        console.log('[InvoiceEditor] Loading invoice count:', count);
        setInvoiceCount(count);
      } catch (error) {
        console.warn('[InvoiceEditor] Error loading invoice count:', error);
        setInvoiceCount(0);
      } finally {
        setCountLoading(false);
      }
    };

    loadInvoiceCount();

    // Also listen for focus events to refresh count when returning to the editor
    const handleFocus = () => {
      loadInvoiceCount();
    };

    window.addEventListener('focus', handleFocus);

    // Refresh every 2 seconds if we're on the free tier to catch updates
    let intervalId = null;
    if (!canUse('unlimited')) {
      intervalId = setInterval(loadInvoiceCount, 2000);
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      if (intervalId) clearInterval(intervalId);
    };
  }, [userProfile]); // Re-run when userProfile changes

  const subtotal = useMemo(() => items.reduce((s, it) => s + toNumber(it.qty) * toNumber(it.rate), 0), [items]);
  const tax = useMemo(() => subtotal * (toNumber(taxPct) / 100), [subtotal, taxPct]);
  const total = useMemo(() => subtotal + tax - toNumber(discount), [subtotal, tax, discount]);
  
  // Autosave functionality
  let autosaveTimer = useRef(null);
  
  useEffect(() => {
    if (initData.id) { // Only autosave if editing existing invoice
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        handleSilentSave();
      }, 1500);
    }
    return () => clearTimeout(autosaveTimer.current);
  }, [client_name, client_email, client_address, payment_terms, number, date, items, notes, taxPct, discount]);
  
  // Helper function for calculating due date
  const calculateDueDate = (invoiceDate, terms) => {
    const dueDate = new Date(invoiceDate);
    switch(terms) {
      case 'Due on receipt':
      case 'Due Upon Completion':
        // Both are immediate payment terms, no date offset
        break;
      case 'Net 15':
        dueDate.setDate(dueDate.getDate() + 15);
        break;
      case 'Net 30':
        dueDate.setDate(dueDate.getDate() + 30);
        break;
      case 'Net 45':
        dueDate.setDate(dueDate.getDate() + 45);
        break;
      case 'Net 60':
        dueDate.setDate(dueDate.getDate() + 60);
        break;
      case 'Net 90':
        dueDate.setDate(dueDate.getDate() + 90);
        break;
      default:
        dueDate.setDate(dueDate.getDate() + 30);
    }
    return dueDate.toISOString().split('T')[0];
  };

  const handleSilentSave = async () => {
    if (!initData.id) return; // Don't autosave new invoices

    setIsSaving(true);

    // Sanitize all text fields
    const sanitizedData = sanitizeObject({
      client_name,
      client_email,
      client_address,
      notes
    });

    const payload = {
      ...initData,
      client_name: sanitizedData.client_name,
      client_email: sanitizedData.client_email,
      client_address: sanitizedData.client_address,
      payment_terms,
      number,
      date,
      dueDate: calculateDueDate(date, payment_terms),
      items: items.filter(it => it.title || it.description || it.qty || it.rate).map(item => sanitizeObject(item)),
      notes: sanitizedData.notes,
      taxPct: toNumber(taxPct),
      discount: toNumber(discount),
      subtotal,
      tax,
      total,
      // Add business information from settings
      business_name: getBusinessName() || 'Business Owner',
      businessName: getBusinessName() || 'Business Owner',
      companyName: getBusinessName() || 'Business Owner',
      business_email: getBusinessEmail(),
      companyEmail: getBusinessEmail(),
      business_phone: getBusinessPhone(),
      companyPhone: getBusinessPhone(),
      business_address: getBusinessAddress(),
      companyAddress: getBusinessAddress(),
      // Add payment methods from settings
      paymentMethods: getSettings().paymentMethods || {},
      // Also save as individual fields for backward compatibility
      business_paypal: getSettings().paymentMethods?.paypalEmail || '',
      business_venmo: getSettings().paymentMethods?.venmoHandle || '',
      business_zelle: getSettings().paymentMethods?.zelleEmail || '',
      business_cashapp: getSettings().paymentMethods?.cashappHandle || ''
    };

    await saveInvoice(payload);
    setLastSaved(new Date());
    setToastMsg('Invoice saved');
    setToastType('success');
    setTimeout(() => setIsSaving(false), 500);
  };
  
  // Line item helpers
  const addEmptyLine = () => {
    setItems(prev => [...prev, { title: '', description: '', qty: 1, rate: 0 }]);
  };
  
  const handleKeyDown = (e, idx, field) => {
    if (e.key === 'Enter' && field === 'description') {
      e.preventDefault();
      addEmptyLine();
      // Focus the new line's item name field after a brief delay
      setTimeout(() => {
        const inputs = document.querySelectorAll('input[placeholder="Item name"]');
        const newInput = inputs[inputs.length - 1];
        if (newInput) newInput.focus();
      }, 50);
    }
    
    if (e.key === 'Tab' && field === 'rate' && idx === items.length - 1 && !e.shiftKey) {
      e.preventDefault();
      addEmptyLine();
    }
  };

  const validate = () => {
    const e = {};

    // Validate client name
    const clientNameResult = validateText(client_name, { required: true, minLength: 2 });
    if (!clientNameResult.isValid) {
      e.client_name = clientNameResult.error;
    }

    // Validate invoice number
    const invoiceResult = validateInvoiceNumber(number);
    if (!invoiceResult.isValid) {
      e.number = invoiceResult.error;
    }

    // Validate client email if provided
    if (client_email) {
      const emailResult = validateEmail(client_email);
      if (!emailResult.isValid) {
        e.client_email = emailResult.error;
      }
    }

    // Validate date
    const dateResult = validateDate(date, { required: true });
    if (!dateResult.isValid) {
      e.date = dateResult.error;
    }

    // Validate items
    const validItems = items.filter(it => it.title || it.description || it.qty || it.rate);
    if (validItems.length === 0) {
      e.items = 'At least one item is required';
    } else {
      validItems.forEach((item, idx) => {
        // Validate quantity
        const qtyResult = validateAmount(item.qty, { required: true, min: 0.01 });
        if (!qtyResult.isValid) {
          e[`item_${idx}_qty`] = qtyResult.error;
        }

        // Validate rate
        const rateResult = validateAmount(item.rate, { required: true, min: 0 });
        if (!rateResult.isValid) {
          e[`item_${idx}_rate`] = rateResult.error;
        }
      });
    }

    // Validate amounts
    const taxResult = validateAmount(taxPct, { min: 0, max: 100 });
    if (!taxResult.isValid) {
      e.tax = taxResult.error;
    }

    const discountResult = validateAmount(discount, { min: 0 });
    if (!discountResult.isValid) {
      e.discount = discountResult.error;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Check if form is valid for sticky bar
  const isFormValid = useMemo(() => {
    return client_name.trim() && number && items.some(it => it.title || it.description);
  }, [client_name, number, items]);

  // Mark form as having unsaved changes
  useEffect(() => {
    if (initData.id || (client_name || client_email || items.some(it => it.title || it.rate))) {
      setHasUnsavedChanges(true);
    }
  }, [client_name, client_email, client_address, payment_terms, number, date, items, notes, taxPct, discount]);

  // Keyboard shortcuts (desktop only)
  useEffect(() => {
    // Only add keyboard shortcuts on devices with keyboards
    if (!shouldShowKeyboardShortcuts()) return;

    const handleKeyDown = (e) => {
      // Ctrl/Cmd + S: Save draft
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveDraft();
      }
      // P: Preview (when not in input field)
      if (e.key === 'p' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        handlePreview();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [client_name, client_email, client_address, payment_terms, number, date, items, notes, taxPct, discount]);

  // Handle save draft
  const handleSaveDraft = async () => {
    setSavingDraft(true);

    // Sanitize all text fields
    const sanitizedData = sanitizeObject({
      client_name,
      client_email,
      client_address,
      notes
    });

    const payload = {
      ...initData,
      client_name: sanitizedData.client_name,
      client_email: sanitizedData.client_email,
      client_address: sanitizedData.client_address,
      payment_terms,
      number,
      date,
      dueDate: calculateDueDate(date, payment_terms),
      items: items.filter(it => it.title || it.description || it.qty || it.rate).map(item => sanitizeObject(item)),
      notes: sanitizedData.notes,
      taxPct: toNumber(taxPct),
      discount: toNumber(discount),
      subtotal,
      tax,
      total,
      status: 'Draft',
      created_at: initData.created_at || new Date(),
      // Add business information from settings
      business_name: getBusinessName() || 'Business Owner',
      businessName: getBusinessName() || 'Business Owner',
      companyName: getBusinessName() || 'Business Owner',
      business_email: getBusinessEmail(),
      companyEmail: getBusinessEmail(),
      business_phone: getBusinessPhone(),
      companyPhone: getBusinessPhone(),
      business_address: getBusinessAddress(),
      companyAddress: getBusinessAddress(),
      // Add payment methods from settings
      paymentMethods: getSettings().paymentMethods || {},
      // Also save as individual fields for backward compatibility
      business_paypal: getSettings().paymentMethods?.paypalEmail || '',
      business_venmo: getSettings().paymentMethods?.venmoHandle || '',
      business_zelle: getSettings().paymentMethods?.zelleEmail || '',
      business_cashapp: getSettings().paymentMethods?.cashappHandle || ''
    };

    if (!initData.id) {
      payload.id = genId();
      // Only update Firestore usage counter (remove localStorage increment)
      console.log('[InvoiceEditor] Incrementing Firestore invoice count - draft save');
      if (incrementInvoiceUsage) {
        try {
          await incrementInvoiceUsage();
          // After successful increment, force refresh the count from Firestore
          // The userProfile should update, which will trigger the useEffect
          const currentCount = userProfile?.usage?.invoicesThisMonth || 0;
          console.log('[InvoiceEditor] Setting count after increment to:', currentCount + 1);
          setInvoiceCount(currentCount + 1); // Optimistically update the UI
        } catch (err) {
          console.error('[InvoiceEditor] Failed to update Firestore invoice usage:', err);
        }
      }
    } else {
      payload.id = initData.id;
    }

    await saveInvoice(payload);
    setHasUnsavedChanges(false);
    setToastMsg('Draft saved');
    setToastType('success');
    setSavingDraft(false);
  };

  // Handle preview
  const handlePreview = () => {
    setPreviewing(true);
    handleSave();
  };

  // Handle back with confirmation
  const handleBack = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    } else {
      onCancel();
    }
  };

  const handleSave = async () => {
    // console.log('💾 InvoiceEditor handleSave triggered');

    // Check invoice limit for new invoices
    if (!isEditing && !canCreateNew) {
      // console.log('❌ Invoice limit reached');
      setShowUpgrade(true);
      return;
    }

    if (!validate()) {
      // console.log('❌ Validation failed:', errors);
      // Scroll to the first error field
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    // Sanitize all text fields before saving
    const sanitizedData = sanitizeObject({
      client_name,
      client_email,
      client_address,
      notes
    });

    const payload = {
      client_name: sanitizedData.client_name,
      client_email: sanitizedData.client_email,
      client_address: sanitizedData.client_address,
      payment_terms,
      terms: payment_terms,
      number,
      date,
      dueDate: calculateDueDate(date, payment_terms),
      items: items.filter(it => it.title || it.description || it.qty || it.rate).map(item => sanitizeObject(item)),
      notes: sanitizedData.notes,
      taxPct: toNumber(taxPct),
      discount: toNumber(discount),
      subtotal,
      tax,
      total,
      status: initData.status || 'Pending',
      created_at: initData.created_at || new Date(),
      // Add business information from settings
      business_name: getBusinessName() || 'Business Owner',
      businessName: getBusinessName() || 'Business Owner',
      companyName: getBusinessName() || 'Business Owner',
      business_email: getBusinessEmail(),
      companyEmail: getBusinessEmail(),
      business_phone: getBusinessPhone(),
      companyPhone: getBusinessPhone(),
      business_address: getBusinessAddress(),
      companyAddress: getBusinessAddress(),
      // Add payment methods from settings
      paymentMethods: getSettings().paymentMethods || {},
      // Also save as individual fields for backward compatibility
      business_paypal: getSettings().paymentMethods?.paypalEmail || '',
      business_venmo: getSettings().paymentMethods?.venmoHandle || '',
      business_zelle: getSettings().paymentMethods?.zelleEmail || '',
      business_cashapp: getSettings().paymentMethods?.cashappHandle || ''
    };

    // Debug logging for payment methods
    const settings = getSettings();
    console.log('InvoiceEditor - Full settings:', JSON.stringify(settings, null, 2));
    console.log('InvoiceEditor - Payment Methods from settings:', JSON.stringify(settings.paymentMethods, null, 2));
    console.log('InvoiceEditor - Payment Methods being saved to invoice:', JSON.stringify(payload.paymentMethods, null, 2));
    console.log('InvoiceEditor - Individual payment fields being saved:', {
      business_paypal: payload.business_paypal,
      business_venmo: payload.business_venmo,
      business_zelle: payload.business_zelle,
      business_cashapp: payload.business_cashapp
    });

    // Ensure ID and persist to localStorage
    const isNewInvoice = !initData.id;
    if (isNewInvoice) {
      payload.id = genId();
      // Only update Firestore usage counter (remove localStorage increment)
      console.log('[InvoiceEditor] Incrementing Firestore invoice count - final save');
      if (incrementInvoiceUsage) {
        try {
          await incrementInvoiceUsage();
          // After successful increment, force refresh the count
          const currentCount = userProfile?.usage?.invoicesThisMonth || 0;
          console.log('[InvoiceEditor] Setting count after final save to:', currentCount + 1);
          setInvoiceCount(currentCount + 1); // Optimistically update the UI
        } catch (err) {
          console.error('[InvoiceEditor] Failed to update Firestore invoice usage:', err);
        }
      }
    } else {
      payload.id = initData.id;
    }

    const saved = await saveInvoice(payload);

    if (onSave) {
      onSave(payload);
    }
  };

  return (
    <PageShell
      title={
        <div className="flex items-center gap-3">
          <span>{initData.id ? `Edit Invoice #${number}` : "New Invoice"}</span>
          {lastSaved && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {isSaving ? 'Saving...' : 'Saved'}
            </span>
          )}
        </div>
      }
      onLogoClick={onLogoClick}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="tertiary"
            onClick={handleBack}
          >
            Back
          </Button>
          <Button
            variant="secondary"
            onClick={handlePreview}
            loading={previewing}
          >
            Preview
          </Button>
          <Button
            variant="secondary"
            onClick={handleSaveDraft}
            loading={savingDraft}
          >
            Save draft
          </Button>
        </div>
      }
    >
      {/* Quick tips for new users */}
      {!initData.id && items.length === 1 && !items[0].title && (
        <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Quick Start:</strong> Fill in your client's name, add line items for your products/services, 
            and click "Save and Preview" to generate a professional PDF invoice.
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-8 space-y-6">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Client Information</h2>
            
            {/* Client selector */}
            {savedClients.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <select
                  onChange={(e) => {
                    const c = savedClients.find(x => x.id === e.target.value);
                    if (!c) return;
                    setClientName(c.name || '');
                    setClientEmail(c.email || '');
                    setClientAddress(c.address || '');
                    setPaymentTerms(c.terms || 'Net 15');
                  }}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue=""
                >
                  <option value="" disabled>Select saved client...</option>
                  {savedClients.map(c => <option key={c.id} value={c.id}>{c.name || 'Unnamed'}</option>)}
                </select>
                <button 
                  type="button" 
                  onClick={() => onOpenClients?.()} 
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                >
                  Manage Clients
                </button>
              </div>
            )}
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1 text-gray-600 dark:text-gray-400">Client name *</label>
                <input
                  value={client_name}
                  onChange={(e)=>setClientName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${errors.client_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Acme Corporation"
                />
                {errors.client_name && <p className="text-sm text-red-500 mt-1">{errors.client_name}</p>}
              </div>
              <div>
                <label className="block text-sm mb-1 text-gray-600 dark:text-gray-400">Client email</label>
                <input 
                  type="email"
                  value={client_email} 
                  onChange={(e)=>setClientEmail(e.target.value)} 
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="billing@acme.com"
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm mb-1 text-gray-600 dark:text-gray-400">Client address</label>
                <textarea 
                  value={client_address} 
                  onChange={(e)=>setClientAddress(e.target.value)} 
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="123 Main St, City, State ZIP"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-gray-600 dark:text-gray-400">Payment terms</label>
                <select 
                  value={payment_terms} 
                  onChange={(e)=>setPaymentTerms(e.target.value)} 
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Due on receipt</option>
                  <option>Due Upon Completion</option>
                  <option>Net 15</option>
                  <option>Net 30</option>
                  <option>Net 45</option>
                  <option>Net 60</option>
                  <option>Net 90</option>
                </select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm mb-1 text-gray-600 dark:text-gray-400">Invoice number *</label>
                <input
                  value={number}
                  onChange={(e)=>setNumber(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${errors.number ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {errors.number && <p className="text-sm text-red-500 mt-1">{errors.number}</p>}
              </div>
              <div>
                <label className="block text-sm mb-1 text-gray-600 dark:text-gray-400">Invoice date</label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={(e)=>setDate(e.target.value)} 
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Line Items</h2>
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  type="button" 
                  onClick={addEmptyLine} 
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                >
                  + Add Line
                </button>
                {savedItems.length > 0 && (
                  <>
                    <select
                      onChange={(e) => {
                        const it = savedItems.find(x => x.id === e.target.value);
                        if (!it) return;
                        setItems(prev => {
                          const next = [...prev];
                          // Add to end
                          next.push({
                            title: it.title || '',
                            description: it.description || '',
                            qty: 1,
                            rate: Number(it.rate || 0)
                          });
                          return next;
                        });
                        e.target.value = '';
                      }}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
                      defaultValue=""
                    >
                      <option value="" disabled>Insert saved item...</option>
                      {savedItems.map(it => (
                        <option key={it.id} value={it.id}>
                          {it.title || it.description?.slice(0,30) || 'Item'} - ${it.rate || 0}
                        </option>
                      ))}
                    </select>
                    <button 
                      type="button" 
                      onClick={() => onOpenItems?.()} 
                      className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                    >
                      Manage Items
                    </button>
                  </>
                )}
              </div>
            </div>
            <LineItemsTable 
              items={items} 
              setItems={setItems}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notes and Terms</h2>
              {!notes && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Optional - Add payment terms or thank you message
                </span>
              )}
            </div>
            <textarea 
              value={notes} 
              onChange={(e)=>setNotes(e.target.value)} 
              rows={4} 
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="Example: Thank you for your business!\n\nPayment is due within 30 days.\nPlease include invoice number with payment."
            />
          </div>
        </section>

        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-6 rounded-xl border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{fmtMoney(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-gray-600 dark:text-gray-400">Tax %</label>
                <input 
                  className="w-24 px-3 py-2 text-right rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  inputMode="decimal" 
                  value={taxPct} 
                  onChange={(e)=>setTaxPct(e.target.value)}
                  placeholder="0"
                />
              </div>
              {toNumber(taxPct) > 0 && (
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Tax ({taxPct}%)</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{fmtMoney(tax)}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-gray-600 dark:text-gray-400">Discount</label>
                <input 
                  className="w-32 px-3 py-2 text-right rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  inputMode="decimal" 
                  value={discount} 
                  onChange={(e)=>setDiscount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              {toNumber(discount) > 0 && (
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Discount</span>
                  <span className="font-medium text-red-600 dark:text-red-400">-{fmtMoney(discount)}</span>
                </div>
              )}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between text-lg font-semibold text-gray-900 dark:text-gray-100" aria-live="polite">
                  <span>Total</span>
                  <span className="text-blue-600 dark:text-blue-400">{fmtMoney(total)}</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <Button
                onClick={handlePreview}
                className="w-full"
                variant="secondary"
                loading={previewing}
              >
                Preview Invoice
              </Button>
              <Button
                onClick={handleSaveDraft}
                className="w-full"
                variant="secondary"
                loading={savingDraft}
              >
                Save Draft {shouldShowKeyboardShortcuts() && <span className="text-xs opacity-60">(Ctrl+S)</span>}
              </Button>
            </div>
          </div>
        </aside>
      </div>
      
      {/* Show limit warning banner for free users */}
      {!canUse('unlimited') && !isEditing && (
        <div className="fixed bottom-4 right-4 max-w-sm p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>{PRICING[subscription.plan]?.name || 'Free'} Plan:</strong> {invoiceCount}/{currentLimits.monthlyLimit} invoices used this month.
            {invoiceCount >= currentLimits.monthlyLimit && (
              <span className="block mt-2">
                <button 
                  onClick={() => setShowUpgrade(true)}
                  className="text-blue-600 dark:text-blue-400 underline font-medium"
                >
                  Upgrade for unlimited
                </button>
              </span>
            )}
          </p>
        </div>
      )}
      
      <Toast 
        message={toastMsg}
        type={toastType}
        duration={2000}
        onClose={() => setToastMsg('')}
      />
      
      <UpgradeModal 
        open={showUpgrade} 
        onClose={() => setShowUpgrade(false)}
        onUpgraded={() => {
          setShowUpgrade(false);
          window.location.reload();
        }}
      />

      {/* Sticky bottom bar for primary action */}
      <StickyBar visible={isFormValid}>
        <Button
          variant="primary"
          onClick={handleSave}
          size="lg"
        >
          Review & Send
        </Button>
      </StickyBar>

      {/* Confirmation dialog for unsaved changes */}
      <ConfirmDialog
        open={showConfirmDialog}
        onConfirm={() => {
          setShowConfirmDialog(false);
          onCancel();
        }}
        onCancel={() => setShowConfirmDialog(false)}
        title="Discard changes?"
        description="You have unsaved changes. Are you sure you want to leave?"
        confirmText="Discard"
        cancelText="Keep editing"
        confirmVariant="destructive"
      />
    </PageShell>
  );
}