export function exportInvoiceHTML({ html, filename = 'invoice.html' }) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateInvoiceHTML(invoice, logoDataUrl, qrDataUrl) {
  const template = invoice.template || 'modern';
  const font = invoice.font || 'Inter';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice #${invoice.number || 'DRAFT'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: '${font}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #f9fafb;
      padding: 20px;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    .logo { max-width: 150px; max-height: 60px; }
    .invoice-title { 
      font-size: 32px; 
      font-weight: bold; 
      color: #111827;
      margin-bottom: 8px;
    }
    .invoice-meta { color: #6b7280; font-size: 14px; }
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
    }
    .party h3 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .party-details { color: #374151; }
    .items-table {
      width: 100%;
      margin-bottom: 30px;
    }
    .items-table th {
      text-align: left;
      padding: 12px;
      border-bottom: 2px solid #e5e7eb;
      font-weight: 600;
      color: #374151;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #f3f4f6;
    }
    .items-table .text-right { text-align: right; }
    .totals {
      margin-left: auto;
      width: 300px;
      margin-bottom: 40px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    .total-row.grand-total {
      font-size: 20px;
      font-weight: bold;
      border-top: 2px solid #e5e7eb;
      padding-top: 12px;
      margin-top: 8px;
    }
    .payment-section {
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .payment-section h3 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #374151;
    }
    .qr-code {
      display: inline-block;
      padding: 10px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      margin-top: 10px;
    }
    .qr-code img { width: 128px; height: 128px; }
    .footer {
      text-align: center;
      color: #9ca3af;
      font-size: 12px;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #f3f4f6;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .status-draft { background: #f3f4f6; color: #6b7280; }
    .status-sent { background: #fef3c7; color: #92400e; }
    .status-paid { background: #d1fae5; color: #065f46; }
    @media print {
      body { background: white; padding: 0; }
      .invoice-container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div>
        ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo" class="logo">` : ''}
        <div class="invoice-title">INVOICE</div>
        <div class="invoice-meta">
          #${invoice.number || 'DRAFT'}<br>
          ${invoice.date || new Date().toLocaleDateString()}<br>
          <span class="status-badge status-${(invoice.status || 'draft').toLowerCase()}">
            ${invoice.status || 'Draft'}
          </span>
        </div>
      </div>
      <div style="text-align: right;">
        <strong>${invoice.from_name || 'Your Company'}</strong><br>
        ${invoice.from_email || ''}<br>
        ${invoice.from_address ? invoice.from_address.replace(/\\n/g, '<br>') : ''}
      </div>
    </div>
    
    <div class="parties">
      <div class="party">
        <h3>Bill To</h3>
        <div class="party-details">
          <strong>${invoice.client_name || invoice.client || 'Client Name'}</strong><br>
          ${invoice.client_email || ''}<br>
          ${invoice.client_address ? invoice.client_address.replace(/\\n/g, '<br>') : ''}
        </div>
      </div>
      <div class="party">
        <h3>Payment Details</h3>
        <div class="party-details">
          Terms: ${invoice.payment_terms || invoice.terms || 'Net 30'}<br>
          ${invoice.dueDate ? `Due: ${new Date(invoice.dueDate).toLocaleDateString()}` : ''}
        </div>
      </div>
    </div>
    
    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Rate</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${(invoice.items || []).map(item => `
          <tr>
            <td>
              <strong>${item.title || ''}</strong><br>
              <span style="color: #6b7280; font-size: 14px;">${item.description || ''}</span>
            </td>
            <td class="text-right">${item.quantity || 1}</td>
            <td class="text-right">$${Number(item.rate || 0).toFixed(2)}</td>
            <td class="text-right">$${(Number(item.quantity || 1) * Number(item.rate || 0)).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="totals">
      <div class="total-row">
        <span>Subtotal</span>
        <span>$${Number(invoice.subtotal || invoice.total || 0).toFixed(2)}</span>
      </div>
      ${invoice.tax ? `
        <div class="total-row">
          <span>Tax</span>
          <span>$${Number(invoice.tax).toFixed(2)}</span>
        </div>
      ` : ''}
      <div class="total-row grand-total">
        <span>Total</span>
        <span>$${Number(invoice.total || 0).toFixed(2)}</span>
      </div>
    </div>
    
    ${invoice.paymentLink || qrDataUrl ? `
      <div class="payment-section">
        <h3>Payment Options</h3>
        ${invoice.paymentLink ? `
          <p>Pay online: <a href="${invoice.paymentLink}" target="_blank">${invoice.paymentLink}</a></p>
        ` : ''}
        ${qrDataUrl ? `
          <div class="qr-code">
            <img src="${qrDataUrl}" alt="QR Code">
            <div style="text-align: center; margin-top: 8px; font-size: 12px; color: #6b7280;">
              Scan to pay
            </div>
          </div>
        ` : ''}
      </div>
    ` : ''}
    
    ${invoice.notes ? `
      <div style="margin-top: 30px; padding: 20px; background: #fef3c7; border-radius: 8px;">
        <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">Notes</h3>
        <p style="white-space: pre-wrap;">${invoice.notes}</p>
      </div>
    ` : ''}
    
    <div class="footer">
      Generated on ${new Date().toLocaleDateString()} • Sleek Invoice Builder
    </div>
  </div>
</body>
</html>`;
}