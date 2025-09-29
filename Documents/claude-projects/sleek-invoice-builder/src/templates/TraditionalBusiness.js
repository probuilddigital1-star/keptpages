const generateTraditionalBusinessHTML = (invoice) => {
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
          font-family: 'Times New Roman', Times, serif;
          line-height: 1.6;
          color: #1a1a1a;
          background: #ffffff;
          padding: 40px;
          font-size: 14px;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border: 2px solid #1a1a1a;
          padding: 0;
        }
        
        .header {
          border-bottom: 3px double #1a1a1a;
          padding: 30px 40px;
          background: #f9f9f9;
          text-align: center;
        }
        
        .company-header {
          margin-bottom: 25px;
        }
        
        .logo {
          max-width: 120px;
          max-height: 60px;
          margin-bottom: 15px;
          object-fit: contain;
        }
        
        .company-name {
          font-size: 28px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 8px;
          color: #1a1a1a;
        }
        
        .company-details {
          font-size: 12px;
          color: #555;
          line-height: 1.4;
        }
        
        .invoice-header {
          border-top: 1px solid #ccc;
          padding-top: 20px;
        }
        
        .invoice-title {
          font-size: 36px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 3px;
          margin-bottom: 10px;
          color: #1a1a1a;
        }
        
        .invoice-number {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 15px;
        }
        
        .invoice-dates {
          font-size: 12px;
          color: #555;
        }
        
        .main-content {
          padding: 40px;
        }
        
        .billing-info {
          display: table;
          width: 100%;
          margin-bottom: 40px;
        }
        
        .bill-to, .ship-to {
          display: table-cell;
          width: 50%;
          vertical-align: top;
          padding-right: 20px;
        }
        
        .ship-to {
          padding-right: 0;
          padding-left: 20px;
        }
        
        .info-title {
          font-size: 14px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-bottom: 2px solid #1a1a1a;
          padding-bottom: 5px;
          margin-bottom: 15px;
          color: #1a1a1a;
        }
        
        .client-info {
          font-size: 14px;
          line-height: 1.6;
        }
        
        .client-name {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #1a1a1a;
        }
        
        .invoice-details-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
          font-size: 12px;
        }
        
        .invoice-details-table td {
          padding: 8px 12px;
          border: 1px solid #ccc;
        }
        
        .invoice-details-table .label {
          background: #f0f0f0;
          font-weight: bold;
          width: 40%;
        }
        
        .items-section {
          margin-bottom: 30px;
        }
        
        .section-title {
          font-size: 16px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #1a1a1a;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          border: 2px solid #1a1a1a;
          margin-bottom: 30px;
        }
        
        .items-table th {
          background: #1a1a1a;
          color: white;
          padding: 15px 12px;
          text-align: left;
          font-weight: bold;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          border: 1px solid #1a1a1a;
        }
        
        .items-table th.number {
          width: 8%;
          text-align: center;
        }
        
        .items-table th.quantity,
        .items-table th.rate {
          width: 15%;
          text-align: right;
        }
        
        .items-table th.amount {
          width: 18%;
          text-align: right;
        }
        
        .items-table td {
          padding: 12px;
          border: 1px solid #ccc;
          font-size: 13px;
          vertical-align: top;
        }
        
        .items-table .number {
          text-align: center;
          font-weight: bold;
        }
        
        .items-table .quantity,
        .items-table .rate,
        .items-table .amount {
          text-align: right;
          font-weight: bold;
        }
        
        .items-table tbody tr:nth-child(even) {
          background: #f9f9f9;
        }
        
        .description {
          font-weight: bold;
          margin-bottom: 4px;
        }
        
        .description-detail {
          font-size: 11px;
          color: #666;
          font-style: italic;
        }
        
        .totals-section {
          float: right;
          width: 300px;
          border: 2px solid #1a1a1a;
        }
        
        .total-row {
          display: table;
          width: 100%;
          border-bottom: 1px solid #ccc;
        }
        
        .total-row:last-child {
          border-bottom: none;
          background: #1a1a1a;
          color: white;
        }
        
        .total-label,
        .total-value {
          display: table-cell;
          padding: 12px 15px;
          font-size: 14px;
        }
        
        .total-label {
          font-weight: bold;
          text-align: right;
          width: 60%;
        }
        
        .total-value {
          text-align: right;
          font-weight: bold;
          width: 40%;
        }
        
        .grand-total .total-label,
        .grand-total .total-value {
          font-size: 16px;
          font-weight: bold;
        }
        
        .notes-section {
          clear: both;
          margin-top: 50px;
          padding: 25px;
          border: 1px solid #ccc;
          background: #f9f9f9;
        }
        
        .notes-title {
          font-size: 14px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 15px;
          color: #1a1a1a;
        }
        
        .notes-content {
          font-size: 13px;
          line-height: 1.6;
          color: #333;
        }
        
        .terms-section {
          margin-top: 40px;
          padding: 20px;
          border: 1px solid #ccc;
          background: #f5f5f5;
        }
        
        .terms-title {
          font-size: 14px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 15px;
          color: #1a1a1a;
        }
        
        .terms-content {
          font-size: 12px;
          line-height: 1.5;
          color: #555;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #1a1a1a;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        
        .signature-section {
          margin-top: 50px;
          display: table;
          width: 100%;
        }
        
        .signature-box {
          display: table-cell;
          width: 50%;
          padding: 20px;
          text-align: center;
        }
        
        .signature-line {
          border-bottom: 1px solid #1a1a1a;
          height: 40px;
          margin-bottom: 10px;
        }
        
        .signature-label {
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          color: #555;
        }
        
        @media print {
          body { padding: 0; }
          .container { border: none; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="company-header">
            ${invoice.logo ? `<img src="${invoice.logo}" class="logo" alt="Company Logo" onerror="this.style.display='none'" />` : ''}
            <div class="company-name">${invoice.businessName || 'Business Services LLC'}</div>
            <div class="company-details">
              Professional Business Solutions<br>
              Licensed & Insured | Est. 2020
            </div>
          </div>
          
          <div class="invoice-header">
            <div class="invoice-title">Invoice</div>
            <div class="invoice-number">No. ${invoice.number}</div>
            <div class="invoice-dates">
              Date: ${new Date(invoice.createdAt || Date.now()).toLocaleDateString()} | 
              Due: ${new Date(invoice.dueDate).toLocaleDateString()}
            </div>
          </div>
        </div>
        
        <div class="main-content">
          <div class="billing-info">
            <div class="bill-to">
              <div class="info-title">Bill To</div>
              <div class="client-info">
                <div class="client-name">${invoice.clientName}</div>
                <div>${invoice.clientEmail}</div>
                ${invoice.clientAddress ? `<div>${invoice.clientAddress}</div>` : ''}
              </div>
            </div>
            
            <div class="ship-to">
              <div class="info-title">Invoice Details</div>
              <table class="invoice-details-table">
                <tr>
                  <td class="label">Invoice Date:</td>
                  <td>${new Date(invoice.createdAt || Date.now()).toLocaleDateString()}</td>
                </tr>
                <tr>
                  <td class="label">Due Date:</td>
                  <td>${new Date(invoice.dueDate).toLocaleDateString()}</td>
                </tr>
                <tr>
                  <td class="label">Payment Terms:</td>
                  <td>Net 30 Days</td>
                </tr>
                <tr>
                  <td class="label">Status:</td>
                  <td style="font-weight: bold; text-transform: uppercase;">${invoice.status}</td>
                </tr>
              </table>
            </div>
          </div>
          
          <div class="items-section">
            <div class="section-title">Description of Services</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th class="number">#</th>
                  <th>Description</th>
                  <th class="quantity">Qty</th>
                  <th class="rate">Rate</th>
                  <th class="amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items.map((item, index) => `
                  <tr>
                    <td class="number">${index + 1}</td>
                    <td>
                      <div class="description">${item.description}</div>
                      <div class="description-detail">Professional services rendered</div>
                    </td>
                    <td class="quantity">${item.quantity}</td>
                    <td class="rate">$${item.price.toFixed(2)}</td>
                    <td class="amount">$${(item.quantity * item.price).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="totals-section">
            <div class="total-row">
              <div class="total-label">Subtotal:</div>
              <div class="total-value">$${invoice.total.toFixed(2)}</div>
            </div>
            <div class="total-row">
              <div class="total-label">Tax (0%):</div>
              <div class="total-value">$0.00</div>
            </div>
            <div class="total-row">
              <div class="total-label">Discount:</div>
              <div class="total-value">$0.00</div>
            </div>
            <div class="total-row grand-total">
              <div class="total-label">Total Due:</div>
              <div class="total-value">$${invoice.total.toFixed(2)}</div>
            </div>
          </div>
          
          ${invoice.notes ? `
            <div class="notes-section">
              <div class="notes-title">Special Instructions</div>
              <div class="notes-content">${invoice.notes}</div>
            </div>
          ` : ''}
          
          <div class="terms-section">
            <div class="terms-title">Terms & Conditions</div>
            <div class="terms-content">
              Payment is due within 30 days of invoice date. A service charge of 1.5% per month 
              (18% annually) will be applied to past due accounts. In the event of default, 
              the customer agrees to pay all costs of collection including reasonable attorney fees.
              All work performed is guaranteed for 30 days from completion date.
            </div>
          </div>
          
          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">Authorized Signature</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">Date</div>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Thank you for your business!</strong></p>
            <p>Please remit payment to the address above within 30 days of invoice date.</p>
            <p>For questions regarding this invoice, please contact us at your earliest convenience.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = { generateTraditionalBusinessHTML };

