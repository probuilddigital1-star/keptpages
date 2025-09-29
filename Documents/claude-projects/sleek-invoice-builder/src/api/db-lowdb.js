const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');

// Initialize lowdb with JSON file
const file = path.join(__dirname, '../../invoices.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

// Initialize with default data
const initDb = async () => {
  await db.read();
  db.data ||= { invoices: [], nextId: 1 };
  await db.write();
  // console.log('Database initialized successfully');
};

// Wrapper to match sqlite3 API
const dbWrapper = {
  run: (sql, params, callback) => {
    try {
      if (sql.includes('INSERT INTO invoices')) {
        const invoice = {
          id: db.data.nextId++,
          number: params[0],
          clientName: params[1],
          clientEmail: params[2],
          clientAddress: params[3],
          items: params[4],
          dueDate: params[5],
          logo: params[6],
          notes: params[7],
          total: params[8],
          status: params[9] || 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        db.data.invoices.push(invoice);
        db.write();
        if (callback) callback.call({ lastID: invoice.id }, null);
      }
    } catch (err) {
      if (callback) callback(err);
    }
  },
  
  get: (sql, params, callback) => {
    try {
      const id = params[0];
      const invoice = db.data.invoices.find(inv => inv.id === parseInt(id));
      if (callback) callback(null, invoice);
    } catch (err) {
      if (callback) callback(err);
    }
  },
  
  all: (sql, params, callback) => {
    try {
      const limit = params[0] || 10;
      const offset = params[1] || 0;
      const invoices = db.data.invoices
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(offset, offset + limit);
      if (callback) callback(null, invoices);
    } catch (err) {
      if (callback) callback(err);
    }
  }
};

module.exports = { db: dbWrapper, initDb };