import { genId, saveInvoice } from '../store/invoices';

export function createSampleInvoice() {
  const today = new Date().toISOString().slice(0, 10);
  const inv = {
    id: genId(),
    number: 'INV-1001',
    date: today,
    client_name: 'Acme Corporation',
    client_email: 'billing@acme.com',
    items: [
      { description: 'Website Design & Development', qty: 1, rate: 2500 },
      { description: 'Logo Design (3 concepts)', qty: 1, rate: 750 },
      { description: 'Consultation Hours', qty: 8, rate: 120 }
    ],
    notes: 'Thank you for your business! Payment is due within 30 days.\n\nPlease make checks payable to Sleek Invoice Co.',
    taxPct: 8.5,
    discount: 100,
    subtotal: 2500 + 750 + (8 * 120),
    tax: (2500 + 750 + (8 * 120) - 100) * 0.085,
    total: (2500 + 750 + (8 * 120) - 100) * 1.085,
    status: 'Draft',
    created_at: new Date().toISOString()
  };
  
  // Calculate accurate totals
  inv.subtotal = inv.items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
  inv.tax = (inv.subtotal - inv.discount) * (inv.taxPct / 100);
  inv.total = inv.subtotal + inv.tax - inv.discount;
  
  saveInvoice(inv);
  return inv;
}