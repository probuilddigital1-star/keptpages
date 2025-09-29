const generateCreativeAgencyHTML = (invoice) => {
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
          font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.7;
          color: #2d3748;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 30px;
          min-height: 100vh;
        }
        
        .container {
          max-width: 850px;
          margin: 0 auto;
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
          position: relative;
        }
        
        .container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 6px;
          background: linear-gradient(90deg, #0f766e, #14b8a6, #06b6d4, #3b82f6, #8b5cf6, #d946ef);
        }
        
        .header {
          padding: 50px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          position: relative;
        }
        
        .header-shapes {
          position: absolute;
          top: 0;
          right: 0;
          width: 200px;
          height: 200px;
          opacity: 0.1;
        }
        
        .shape-1 {
          position: absolute;
          top: -50px;
          right: -50px;
          width: 150px;
          height: 150px;
          background: linear-gradient(45deg, #0f766e, #14b8a6);
          border-radius: 50%;
        }
        
        .shape-2 {
          position: absolute;
          top: 20px;
          right: 30px;
          width: 80px;
          height: 80px;
          background: linear-gradient(45deg, #3b82f6, #8b5cf6);
          transform: rotate(45deg);
        }
        
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          position: relative;
          z-index: 2;
        }
        
        .logo-section {
          flex: 1;
        }
        
        .logo {
          max-width: 140px;
          max-height: 70px;
          margin-bottom: 25px;
          border-radius: 12px;
          object-fit: contain;
        }
        
        .company-name {
          font-size: 32px;
          font-weight: 800;
          background: linear-gradient(135deg, #0f766e, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
          letter-spacing: -1px;
        }
        
        .tagline {
          font-size: 16px;
          color: #64748b;
          font-weight: 500;
          font-style: italic;
        }
        
        .invoice-header {
          text-align: right;
          flex: 1;
        }
        
        .invoice-title {
          font-size: 56px;
          font-weight: 900;
          background: linear-gradient(135deg, #2563EB, #60A5FA);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 10px;
          letter-spacing: -2px;
        }
        
        .invoice-number {
          font-size: 20px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 20px;
        }
        
        .status-badge {
          display: inline-block;
          padding: 12px 24px;
          border-radius: 50px;
          font-weight: 700;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
          background: linear-gradient(135deg, #0f766e, #14b8a6);
          color: white;
          box-shadow: 0 4px 15px rgba(15, 118, 110, 0.3);
        }
        
        .main-content {
          padding: 50px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 50px;
          margin-bottom: 50px;
        }
        
        .info-card {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }
        
        .card-title {
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #0f766e;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
        }
        
        .card-title::before {
          content: '';
          width: 4px;
          height: 20px;
          background: linear-gradient(135deg, #0f766e, #14b8a6);
          border-radius: 2px;
          margin-right: 12px;
        }
        
        .client-name {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 12px;
        }
        
        .client-details {
          font-size: 16px;
          line-height: 1.8;
          color: #475569;
        }
        
        .meta-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .meta-item:last-child {
          border-bottom: none;
        }
        
        .meta-label {
          font-weight: 600;
          color: #64748b;
        }
        
        .meta-value {
          font-weight: 700;
          color: #1e293b;
        }
        
        .items-section {
          margin-bottom: 40px;
        }
        
        .section-title {
          font-size: 24px;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 30px;
          padding-bottom: 15px;
          border-bottom: 3px solid #0f766e;
          display: inline-block;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        
        .items-table thead {
          background: linear-gradient(135deg, #0f766e, #14b8a6);
          color: white;
        }
        
        .items-table th {
          padding: 25px 20px;
          text-align: left;
          font-weight: 700;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .items-table th:last-child {
          text-align: right;
        }
        
        .items-table td {
          padding: 25px 20px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 16px;
          background: white;
        }
        
        .items-table td:last-child {
          text-align: right;
          font-weight: 700;
          color: #0f766e;
        }
        
        .items-table tbody tr:nth-child(even) {
          background: #f8fafc;
        }
        
        .items-table tbody tr:hover {
          background: #f1f5f9;
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }
        
        .items-table tbody tr:last-child td {
          border-bottom: none;
        }
        
        .item-description {
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 4px;
        }
        
        .item-meta {
          font-size: 14px;
          color: #64748b;
        }
        
        .total-section {
          margin-left: auto;
          width: 350px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 0;
          font-size: 16px;
          font-weight: 600;
        }
        
        .total-row.grand-total {
          border-top: 3px solid #0f766e;
          margin-top: 20px;
          padding-top: 25px;
          font-size: 28px;
          font-weight: 800;
          color: #0f766e;
        }
        
        .notes-section {
          margin-top: 50px;
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          border-radius: 16px;
          padding: 30px;
          border-left: 6px solid #f59e0b;
          position: relative;
          overflow: hidden;
        }
        
        .notes-section::before {
          content: '★';
          position: absolute;
          top: -10px;
          right: -10px;
          font-size: 100px;
          opacity: 0.1;
        }
        
        .notes-title {
          font-size: 18px;
          font-weight: 700;
          color: #92400e;
          margin-bottom: 15px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .notes-content {
          font-size: 16px;
          line-height: 1.8;
          color: #78350f;
          font-weight: 500;
        }
        
        .footer {
          background: linear-gradient(135deg, #1e293b, #334155);
          color: white;
          padding: 40px 50px;
          text-align: center;
        }
        
        .footer-message {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 10px;
        }
        
        .footer-details {
          font-size: 14px;
          opacity: 0.8;
        }
        
        @media print {
          body { 
            padding: 0; 
            background: white;
          }
          .container { 
            box-shadow: none; 
            border-radius: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-shapes">
            <div class="shape-1"></div>
            <div class="shape-2"></div>
          </div>
          <div class="header-content">
            <div class="logo-section">
              ${invoice.logo ? `<img src="${invoice.logo}" class="logo" alt="Company Logo" onerror="this.style.display='none'" />` : ''}
              <div class="company-name">${invoice.businessName || 'Creative Studio'}</div>
              <div class="tagline">Bringing ideas to life</div>
            </div>
            <div class="invoice-header">
              <div class="invoice-title">INVOICE</div>
              <div class="invoice-number">#${invoice.number}</div>
              <div class="status-badge">${invoice.status.toUpperCase()}</div>
            </div>
          </div>
        </div>
        
        <div class="main-content">
          <div class="info-grid">
            <div class="info-card">
              <div class="card-title">Bill To</div>
              <div class="client-name">${invoice.clientName}</div>
              <div class="client-details">
                <div>${invoice.clientEmail}</div>
                ${invoice.clientAddress ? `<div>${invoice.clientAddress}</div>` : ''}
              </div>
            </div>
            
            <div class="info-card">
              <div class="card-title">Invoice Details</div>
              <div class="meta-item">
                <span class="meta-label">Issue Date</span>
                <span class="meta-value">${new Date(invoice.createdAt || Date.now()).toLocaleDateString()}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Due Date</span>
                <span class="meta-value">${new Date(invoice.dueDate).toLocaleDateString()}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Project</span>
                <span class="meta-value">Creative Services</span>
              </div>
            </div>
          </div>
          
          <div class="items-section">
            <div class="section-title">Project Breakdown</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Service Description</th>
                  <th>Hours</th>
                  <th>Rate</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items.map(item => `
                  <tr>
                    <td>
                      <div class="item-description">${item.description}</div>
                      <div class="item-meta">Professional creative services</div>
                    </td>
                    <td>${item.quantity}</td>
                    <td>$${item.price.toFixed(2)}</td>
                    <td>$${(item.quantity * item.price).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="total-section">
            <div class="total-row">
              <span>Subtotal</span>
              <span>$${invoice.total.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Creative Fee</span>
              <span>$0.00</span>
            </div>
            <div class="total-row">
              <span>Tax</span>
              <span>$0.00</span>
            </div>
            <div class="total-row grand-total">
              <span>Total Due</span>
              <span>$${invoice.total.toFixed(2)}</span>
            </div>
          </div>
          
          ${invoice.notes ? `
            <div class="notes-section">
              <div class="notes-title">Project Notes</div>
              <div class="notes-content">${invoice.notes}</div>
            </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <div class="footer-message">Thank you for choosing our creative services!</div>
          <div class="footer-details">Payment terms: Net 30 days | Late fees may apply after due date</div>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = { generateCreativeAgencyHTML };

