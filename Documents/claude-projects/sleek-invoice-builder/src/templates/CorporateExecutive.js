const generateCorporateExecutiveHTML = (invoice) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice #${invoice.number}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1e293b;
          background: #ffffff;
          padding: 40px;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .header {
          background: linear-gradient(135deg, #0B1426 0%, #1E3A5F 100%);
          color: white;
          padding: 40px;
          position: relative;
          overflow: hidden;
        }
        
        .header::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          pointer-events: none;
        }
        
        .header-content {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        
        .logo-section {
          flex: 1;
        }
        
        .logo {
          max-width: 140px;
          max-height: 70px;
          margin-bottom: 20px;
          filter: brightness(0) invert(1);
          object-fit: contain;
        }
        
        .company-name {
          font-size: 28px;
          font-weight: 300;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }
        
        .invoice-details {
          text-align: right;
          flex: 1;
        }
        
        .invoice-title {
          font-size: 48px;
          font-weight: 100;
          letter-spacing: 2px;
          margin-bottom: 10px;
          opacity: 0.9;
        }
        
        .invoice-number {
          font-size: 24px;
          font-weight: 500;
          margin-bottom: 15px;
        }
        
        .invoice-status {
          display: inline-block;
          padding: 8px 20px;
          border-radius: 25px;
          font-weight: 500;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .main-content {
          padding: 50px;
        }
        
        .billing-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 50px;
        }
        
        .bill-to, .invoice-meta {
          flex: 1;
        }
        
        .bill-to {
          margin-right: 40px;
        }
        
        .section-title {
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #64748b;
          margin-bottom: 15px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 8px;
        }
        
        .client-info {
          font-size: 16px;
          line-height: 1.8;
        }
        
        .client-name {
          font-size: 20px;
          font-weight: 600;
          color: #0B1426;
          margin-bottom: 8px;
        }
        
        .invoice-meta-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        
        .invoice-meta-item:last-child {
          border-bottom: none;
        }
        
        .meta-label {
          font-weight: 500;
          color: #64748b;
        }
        
        .meta-value {
          font-weight: 600;
          color: #1e293b;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 40px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          overflow: hidden;
        }
        
        .items-table thead {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }
        
        .items-table th {
          padding: 20px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #475569;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .items-table th:last-child {
          text-align: right;
        }
        
        .items-table td {
          padding: 20px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 15px;
        }
        
        .items-table td:last-child {
          text-align: right;
          font-weight: 600;
        }
        
        .items-table tbody tr:hover {
          background: #f8fafc;
        }
        
        .items-table tbody tr:last-child td {
          border-bottom: none;
        }
        
        .description {
          font-weight: 500;
          color: #1e293b;
        }
        
        .quantity, .price {
          color: #64748b;
          font-weight: 500;
        }
        
        .total-section {
          margin-left: auto;
          width: 300px;
          border-top: 3px solid #2563EB;
          padding-top: 20px;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          font-size: 16px;
        }
        
        .total-row.grand-total {
          border-top: 2px solid #e2e8f0;
          margin-top: 15px;
          padding-top: 20px;
          font-size: 24px;
          font-weight: 700;
          color: #0B1426;
        }
        
        .notes-section {
          margin-top: 50px;
          padding: 30px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 12px;
          border-left: 4px solid #2563EB;
        }
        
        .notes-title {
          font-size: 16px;
          font-weight: 600;
          color: #0B1426;
          margin-bottom: 15px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .notes-content {
          font-size: 15px;
          line-height: 1.7;
          color: #475569;
        }
        
        .footer {
          margin-top: 60px;
          padding-top: 30px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          color: #64748b;
          font-size: 14px;
        }
        
        @media print {
          body { padding: 0; }
          .container { box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-content">
            <div class="logo-section">
              ${invoice.logo ? `<img src="${invoice.logo}" class="logo" alt="Company Logo" onerror="this.style.display='none'" />` : ''}
              <div class="company-name">${invoice.businessName || 'Professional Services'}</div>
            </div>
            <div class="invoice-details">
              <div class="invoice-title">INVOICE</div>
              <div class="invoice-number">#${invoice.number}</div>
              <div class="invoice-status">${invoice.status.toUpperCase()}</div>
            </div>
          </div>
        </div>
        
        <div class="main-content">
          <div class="billing-section">
            <div class="bill-to">
              <div class="section-title">Bill To</div>
              <div class="client-info">
                <div class="client-name">${invoice.clientName}</div>
                <div>${invoice.clientEmail}</div>
                ${invoice.clientAddress ? `<div>${invoice.clientAddress}</div>` : ''}
              </div>
            </div>
            
            <div class="invoice-meta">
              <div class="section-title">Invoice Details</div>
              <div class="invoice-meta-item">
                <span class="meta-label">Issue Date</span>
                <span class="meta-value">${new Date(invoice.createdAt || Date.now()).toLocaleDateString()}</span>
              </div>
              <div class="invoice-meta-item">
                <span class="meta-label">Due Date</span>
                <span class="meta-value">${new Date(invoice.dueDate).toLocaleDateString()}</span>
              </div>
              <div class="invoice-meta-item">
                <span class="meta-label">Payment Terms</span>
                <span class="meta-value">Net 30</span>
              </div>
            </div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map(item => `
                <tr>
                  <td class="description">${item.description}</td>
                  <td class="quantity">${item.quantity}</td>
                  <td class="price">$${item.price.toFixed(2)}</td>
                  <td>$${(item.quantity * item.price).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="total-section">
            <div class="total-row">
              <span>Subtotal</span>
              <span>$${invoice.total.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Tax (0%)</span>
              <span>$0.00</span>
            </div>
            <div class="total-row grand-total">
              <span>Total</span>
              <span>$${invoice.total.toFixed(2)}</span>
            </div>
          </div>
          
          ${invoice.notes ? `
            <div class="notes-section">
              <div class="notes-title">Notes</div>
              <div class="notes-content">${invoice.notes}</div>
            </div>
          ` : ''}
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Payment is due within 30 days of invoice date.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = { generateCorporateExecutiveHTML };

