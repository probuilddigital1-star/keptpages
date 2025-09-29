const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const { uploadLogo } = require('./upload');
const { db } = require('./db');
const puppeteer = require('puppeteer');
const { generateInvoiceHTML } = require('../templates');

// Upload logo
router.post('/upload', uploadLogo.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ url: `/uploads/${req.file.filename}` });
});

// Create invoice
router.post('/invoices', (req, res) => {
  const { number, clientName, clientEmail, clientAddress, items, dueDate, logo, notes, total, status, documentType } = req.body;
  
  db.run(
    `INSERT INTO invoices (number, clientName, clientEmail, clientAddress, items, dueDate, logo, notes, total, status, documentType)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [number, clientName, clientEmail, clientAddress, JSON.stringify(items), dueDate, logo, notes, total, status, documentType || 'invoice'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, ...req.body });
    }
  );
});

// Get invoices with pagination
router.get('/invoices', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;
  const documentType = req.query.type || 'invoice';
  
  db.all(
    'SELECT * FROM invoices WHERE documentType = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?',
    [documentType, limit, offset],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const invoices = rows.map(row => ({
        ...row,
        items: JSON.parse(row.items)
      }));
      
      res.json({ invoices, page, limit });
    }
  );
});

// Get single invoice
router.get('/invoices/:id', (req, res) => {
  db.get('SELECT * FROM invoices WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Invoice not found' });
    
    res.json({
      ...row,
      items: JSON.parse(row.items)
    });
  });
});

// Update invoice
router.put('/invoices/:id', (req, res) => {
  const { number, clientName, clientEmail, clientAddress, items, dueDate, logo, notes, total, status } = req.body;
  
  db.run(
    `UPDATE invoices SET number = ?, clientName = ?, clientEmail = ?, clientAddress = ?, 
     items = ?, dueDate = ?, logo = ?, notes = ?, total = ?, status = ?, updatedAt = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [number, clientName, clientEmail, clientAddress, JSON.stringify(items), dueDate, logo, notes, total, status, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Invoice not found' });
      res.json({ id: req.params.id, ...req.body });
    }
  );
});

// Generate PDF
router.post('/invoices/:id/pdf', async (req, res) => {
  try {
    const { template = 'basic' } = req.body;
    
    const invoice = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM invoices WHERE id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else if (!row) reject(new Error('Invoice not found'));
        else resolve({ ...row, items: JSON.parse(row.items) });
      });
    });

    // Convert relative logo path to absolute URL for PDF generation
    if (invoice.logo && invoice.logo.startsWith('/uploads/')) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      invoice.logo = `${baseUrl}${invoice.logo}`;
    }

    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    const html = generateInvoiceHTML(invoice, template);
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      displayHeaderFooter: false
    });
    
    await browser.close();
    
    res.contentType('application/pdf');
    res.send(pdf);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;