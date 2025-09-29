import { logError, logInfo } from './utils/errorHandler';

// Test file to verify functionality in browser console
// Copy and paste these functions into browser console to test

// Test 1: Check if localStorage is working
function testLocalStorage() {
  try {
    const testKey = 'test_' + Date.now();
    localStorage.setItem(testKey, 'test_value');
    const value = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    console.log('✅ LocalStorage works:', value === 'test_value');
    return true;
  } catch (e) {
    logError('TestFunctions.❌', e);
    return false;
  }
}

// Test 2: Check invoice storage
function testInvoiceStorage() {
  try {
    const KEY = 'sleek_invoices_v1';
    
    // Create test invoice
    const testInvoice = {
      id: 'test_' + Date.now(),
      client_name: 'Test Client',
      client_email: 'test@example.com',
      number: 'INV-TEST-001',
      date: new Date().toISOString().slice(0, 10),
      items: [
        { description: 'Test Service', qty: 1, rate: 100 }
      ],
      subtotal: 100,
      tax: 0,
      discount: 0,
      total: 100,
      status: 'Draft',
      created_at: new Date()
    };
    
    // Save invoice
    const existing = JSON.parse(localStorage.getItem(KEY) || '[]');
    existing.unshift(testInvoice);
    localStorage.setItem(KEY, JSON.stringify(existing));
    
    // Read it back
    const stored = JSON.parse(localStorage.getItem(KEY));
    const found = stored.find(inv => inv.id === testInvoice.id);
    
    console.log('✅ Invoice saved:', found);
    console.log('Total invoices in storage:', stored.length);
    
    // Return for inspection
    return { saved: testInvoice, retrieved: found, total: stored.length };
  } catch (e) {
    logError('TestFunctions.❌', e);
    return null;
  }
}

// Test 3: Check settings storage
function testSettingsStorage() {
  try {
    const KEY = 'sleek_settings_v1';
    
    // Save test settings
    const testSettings = {
      logoDataUrl: 'data:image/png;base64,test',
      companyName: 'Test Company',
      timestamp: Date.now()
    };
    
    localStorage.setItem(KEY, JSON.stringify(testSettings));
    
    // Read it back
    const stored = JSON.parse(localStorage.getItem(KEY));
    
    console.log('✅ Settings saved:', stored);
    
    return stored;
  } catch (e) {
    logError('TestFunctions.❌', e);
    return null;
  }
}

// Test 4: List all invoices
function listAllInvoices() {
  try {
    const KEY = 'sleek_invoices_v1';
    const invoices = JSON.parse(localStorage.getItem(KEY) || '[]');
    
    console.log('📋 Total invoices:', invoices.length);
    invoices.forEach((inv, i) => {
      console.log(`  ${i + 1}. ${inv.number || inv.id} - ${inv.client_name} - $${inv.total}`);
    });
    
    return invoices;
  } catch (e) {
    logError('TestFunctions.❌', e);
    return [];
  }
}

// Test 5: Clear all test data
function clearTestData() {
  try {
    const KEY = 'sleek_invoices_v1';
    const invoices = JSON.parse(localStorage.getItem(KEY) || '[]');
    
    // Remove only test invoices
    const filtered = invoices.filter(inv => !inv.id.startsWith('test_'));
    localStorage.setItem(KEY, JSON.stringify(filtered));
    
    console.log('✅ Cleared test data. Remaining invoices:', filtered.length);
    
    return filtered;
  } catch (e) {
    logError('TestFunctions.❌', e);
    return null;
  }
}

// Run all tests
function runAllTests() {
  console.log('🧪 Running functionality tests...\n');
  
  console.log('1. LocalStorage Test:');
  testLocalStorage();
  
  console.log('\n2. Invoice Storage Test:');
  const invoice = testInvoiceStorage();
  
  console.log('\n3. Settings Storage Test:');
  testSettingsStorage();
  
  console.log('\n4. List All Invoices:');
  listAllInvoices();
  
  console.log('\n✅ Tests complete! Use clearTestData() to remove test invoices.');
  
  return { invoice };
}

// Export for browser console
console.log(`
🧪 Invoice App Functionality Tests Loaded!

Available functions:
- runAllTests() - Run all tests
- testLocalStorage() - Test localStorage access
- testInvoiceStorage() - Test invoice save/load
- testSettingsStorage() - Test settings save/load
- listAllInvoices() - List all stored invoices
- clearTestData() - Remove test invoices

Run 'runAllTests()' to start!
`);

// Auto-export to window for console access
if (typeof window !== 'undefined') {
  window.testFunctions = {
    runAllTests,
    testLocalStorage,
    testInvoiceStorage,
    testSettingsStorage,
    listAllInvoices,
    clearTestData
  };
}