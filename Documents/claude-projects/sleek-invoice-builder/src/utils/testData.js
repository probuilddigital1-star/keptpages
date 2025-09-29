import { saveInvoice, setInvoiceStatus } from '../store/invoices';

// Generate test data for demonstration
export function generateTestInvoices() {
  const today = new Date();
  const clients = [
    { name: 'Acme Corporation', email: 'billing@acme.com' },
    { name: 'TechStart Inc', email: 'accounts@techstart.com' },
    { name: 'Global Solutions Ltd', email: 'finance@globalsolutions.com' },
    { name: 'Creative Agency', email: 'invoices@creativeagency.com' },
    { name: 'Digital Services Co', email: 'payments@digitalservices.co' }
  ];

  const services = [
    { description: 'Website Development', rate: 1500, hours: 20 },
    { description: 'Mobile App Design', rate: 1200, hours: 15 },
    { description: 'SEO Optimization', rate: 800, hours: 10 },
    { description: 'Consulting Services', rate: 2000, hours: 8 },
    { description: 'API Integration', rate: 1800, hours: 12 }
  ];

  const invoices = [];

  // Generate 6 months of invoices
  for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
    const invoiceDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 15);
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);

    // Create 1-3 invoices per month
    const invoicesThisMonth = monthOffset === 0 ? 2 : Math.floor(Math.random() * 2) + 1;

    for (let i = 0; i < invoicesThisMonth; i++) {
      const client = clients[Math.floor(Math.random() * clients.length)];
      const service = services[Math.floor(Math.random() * services.length)];
      const quantity = Math.floor(Math.random() * 5) + 1;
      const subtotal = service.rate * quantity;
      const tax = subtotal * 0.1;
      const total = subtotal + tax;

      const invoice = {
        id: `test-${Date.now()}-${Math.random()}`,
        number: `INV-${today.getFullYear()}${String(today.getMonth() - monthOffset + 1).padStart(2, '0')}${String(i + 1).padStart(3, '0')}`,
        date: invoiceDate.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        client_name: client.name,
        clientEmail: client.email,
        items: [{
          id: Date.now(),
          description: service.description,
          quantity: quantity,
          rate: service.rate,
          amount: subtotal
        }],
        subtotal: subtotal,
        tax: tax,
        total: total,
        taxRate: 10,
        notes: 'Thank you for your business!',
        terms: 'Payment due within 30 days',
        status: 'Pending',
        createdAt: invoiceDate.toISOString(),
        updatedAt: invoiceDate.toISOString()
      };

      // Set status based on age
      if (monthOffset > 2) {
        // Older invoices are mostly paid
        invoice.status = 'paid';
        const paidDate = new Date(invoiceDate);
        paidDate.setDate(paidDate.getDate() + Math.floor(Math.random() * 20) + 5);
        invoice.paidAt = paidDate.toISOString();
      } else if (monthOffset > 0) {
        // Some recent ones are sent
        invoice.status = Math.random() > 0.5 ? 'sent' : 'paid';
        if (invoice.status === 'paid') {
          const paidDate = new Date(invoiceDate);
          paidDate.setDate(paidDate.getDate() + Math.floor(Math.random() * 20) + 5);
          invoice.paidAt = paidDate.toISOString();
        }
      }
      // Current month invoices remain as Pending

      invoices.push(invoice);
    }
  }

  return invoices;
}

// Save test invoices to localStorage
export function loadTestData() {
  const existingInvoices = JSON.parse(localStorage.getItem('invoices') || '[]');

  if (existingInvoices.length > 0) {
    if (!confirm('This will replace existing invoices with test data. Continue?')) {
      return false;
    }
  }

  const testInvoices = generateTestInvoices();

  // Save directly to localStorage to preserve all fields
  localStorage.setItem('invoices', JSON.stringify(testInvoices));

  // console.log(`Generated ${testInvoices.length} test invoices`);

  // Calculate some stats
  const paidCount = testInvoices.filter(inv => inv.status === 'paid').length;
  const totalRevenue = testInvoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);

  // console.log(`${paidCount} paid invoices with total revenue: $${totalRevenue.toFixed(2)}`);

  return true;
}