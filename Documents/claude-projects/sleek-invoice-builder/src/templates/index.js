const { generateCorporateExecutiveHTML } = require('./CorporateExecutive');
const { generateCreativeAgencyHTML } = require('./CreativeAgency');
const { generateTraditionalBusinessHTML } = require('./TraditionalBusiness');

const TEMPLATES = {
  basic: {
    id: 'basic',
    name: 'Basic Invoice',
    description: 'Simple, clean design for general use',
    tier: 'free',
    preview: '/templates/previews/basic.png',
    generator: null // Will use the existing basic template
  },
  corporate: {
    id: 'corporate',
    name: 'Corporate Executive',
    description: 'Professional design for corporate businesses',
    tier: 'pro',
    preview: '/templates/previews/corporate.png',
    generator: generateCorporateExecutiveHTML
  },
  creative: {
    id: 'creative',
    name: 'Creative Agency',
    description: 'Modern, colorful design for creative professionals',
    tier: 'pro',
    preview: '/templates/previews/creative.png',
    generator: generateCreativeAgencyHTML
  },
  traditional: {
    id: 'traditional',  
    name: 'Traditional Business',
    description: 'Classic, formal design for traditional businesses',
    tier: 'pro',
    preview: '/templates/previews/traditional.png',
    generator: generateTraditionalBusinessHTML
  }
};

const getTemplate = (templateId) => {
  return TEMPLATES[templateId] || TEMPLATES.basic;
};

const getAvailableTemplates = (userTier = 'free') => {
  return Object.values(TEMPLATES).filter(template => 
    template.tier === 'free' || userTier === 'pro'
  );
};

const generateInvoiceHTML = (invoice, templateId = 'basic') => {
  const template = getTemplate(templateId);
  
  if (template.generator) {
    return template.generator(invoice);
  }
  
  // Fallback to basic template (existing implementation)
  return generateBasicInvoiceHTML(invoice);
};

// Basic template (existing implementation)
const generateBasicInvoiceHTML = (invoice) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .logo { max-width: 100px; max-height: 50px; }
        .invoice-title { font-size: 32px; font-weight: bold; color: #0B1426; }
        .status { font-size: 20px; font-weight: bold; text-transform: uppercase; }
        .client-info { margin-bottom: 30px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .items-table th { background-color: #f3f4f6; font-weight: bold; }
        .total { text-align: right; font-size: 24px; font-weight: bold; color: #2563EB; }
        .notes { margin-top: 30px; padding: 20px; background-color: #f9fafb; border-radius: 8px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          ${invoice.logo ? `<img src="${invoice.logo}" class="logo" />` : ''}
          <h1 class="invoice-title">Invoice #${invoice.number}</h1>
        </div>
        <div>
          <p class="status ${invoice.status === 'paid' ? 'text-green' : invoice.status === 'overdue' ? 'text-red' : 'text-yellow'}">${invoice.status}</p>
          <p>Due: ${new Date(invoice.dueDate).toLocaleDateString()}</p>
        </div>
      </div>
      
      <div class="client-info">
        <h3>Bill To:</h3>
        <p><strong>${invoice.clientName}</strong></p>
        <p>${invoice.clientEmail}</p>
        ${invoice.clientAddress ? `<p>${invoice.clientAddress}</p>` : ''}
      </div>
      
      <table class="items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items.map(item => `
            <tr>
              <td>${item.description}</td>
              <td>${item.quantity}</td>
              <td>$${item.price.toFixed(2)}</td>
              <td>$${(item.quantity * item.price).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <p class="total">Total: $${invoice.total.toFixed(2)}</p>
      
      ${invoice.notes ? `<div class="notes"><h3>Notes:</h3><p>${invoice.notes}</p></div>` : ''}
    </body>
    </html>
  `;
};

module.exports = {
  TEMPLATES,
  getTemplate,
  getAvailableTemplates,
  generateInvoiceHTML
};

