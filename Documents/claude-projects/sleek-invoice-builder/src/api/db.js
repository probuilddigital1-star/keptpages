import { logError, logInfo } from '../utils/errorHandler';

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../invoices.json');

// Initialize empty database structure
let database = {
  invoices: [],
  nextId: 1
};

// Load database from file if it exists
const loadDatabase = () => {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      database = JSON.parse(data);
    }
  } catch (err) {
    logError('Database.loading', err);
  }
};

// Save database to file
const saveDatabase = () => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
  } catch (err) {
    logError('Database.saving', err);
    throw err;
  }
};

// Initialize database
const initDb = () => {
  try {
    loadDatabase();
    
    // Ensure database structure exists
    if (!database.invoices) {
      database.invoices = [];
    }
    if (!database.nextId) {
      database.nextId = 1;
    }
    
    saveDatabase();
    // console.log('JSON database initialized successfully');
  } catch (err) {
    logError('Database.to', err);
    throw err;
  }
};

// SQL-like wrapper functions to maintain API compatibility
const dbWrapper = {
  run: (sql, params, callback) => {
    try {
      let result = { lastID: null, changes: 0 };
      
      // Parse SQL command (simplified for basic operations)
      const sqlLower = sql.toLowerCase().trim();
      
      if (sqlLower.startsWith('insert into invoices')) {
        // Extract values from SQL
        const invoice = {
          id: database.nextId++,
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
        
        database.invoices.push(invoice);
        saveDatabase();
        
        result.lastID = invoice.id;
        result.changes = 1;
      } else if (sqlLower.startsWith('update invoices')) {
        // Extract ID from WHERE clause
        const whereMatch = sql.match(/where\s+id\s*=\s*\?/i);
        if (whereMatch) {
          const id = parseInt(params[params.length - 1]);
          const index = database.invoices.findIndex(inv => inv.id === id);
          
          if (index !== -1) {
            // For the specific UPDATE query in routes.js, we know the field order
            if (params.length >= 11) {
              database.invoices[index].number = params[0];
              database.invoices[index].clientName = params[1];
              database.invoices[index].clientEmail = params[2];
              database.invoices[index].clientAddress = params[3];
              database.invoices[index].items = params[4];
              database.invoices[index].dueDate = params[5];
              database.invoices[index].logo = params[6];
              database.invoices[index].notes = params[7];
              database.invoices[index].total = params[8];
              database.invoices[index].status = params[9];
              database.invoices[index].updatedAt = new Date().toISOString();
              
              saveDatabase();
              result.changes = 1;
            }
          }
        }
      } else if (sqlLower.startsWith('delete from invoices')) {
        const id = parseInt(params[0]);
        const index = database.invoices.findIndex(inv => inv.id === id);
        
        if (index !== -1) {
          database.invoices.splice(index, 1);
          saveDatabase();
          result.changes = 1;
        }
      }
      
      if (callback) callback.call(result, null);
      return result;
    } catch (err) {
      if (callback) callback(err);
      throw err;
    }
  },
  
  get: (sql, params, callback) => {
    try {
      let row = null;
      const sqlLower = sql.toLowerCase().trim();
      
      if (sqlLower.includes('where id = ?')) {
        const id = parseInt(params[0]);
        row = database.invoices.find(inv => inv.id === id) || null;
      } else if (sqlLower.includes('where number = ?')) {
        const number = params[0];
        row = database.invoices.find(inv => inv.number === number) || null;
      }
      
      if (callback) callback(null, row);
      return row;
    } catch (err) {
      if (callback) callback(err);
      throw err;
    }
  },
  
  all: (sql, params, callback) => {
    try {
      let rows = [...database.invoices];
      const sqlLower = sql.toLowerCase().trim();
      
      // Apply ORDER BY if present
      if (sqlLower.includes('order by')) {
        const orderMatch = sql.match(/order\s+by\s+(\w+)(?:\s+(asc|desc))?/i);
        if (orderMatch) {
          const field = orderMatch[1];
          const desc = orderMatch[2] && orderMatch[2].toLowerCase() === 'desc';
          
          rows.sort((a, b) => {
            if (field === 'createdAt' || field === 'updatedAt') {
              return desc 
                ? new Date(b[field]) - new Date(a[field])
                : new Date(a[field]) - new Date(b[field]);
            }
            return desc ? b[field] - a[field] : a[field] - b[field];
          });
        }
      }
      
      // Apply LIMIT and OFFSET if present
      if (sqlLower.includes('limit')) {
        const limitMatch = sql.match(/limit\s+(\d+)(?:\s+offset\s+(\d+))?/i);
        if (limitMatch) {
          const limit = parseInt(limitMatch[1]);
          const offset = limitMatch[2] ? parseInt(limitMatch[2]) : 0;
          rows = rows.slice(offset, offset + limit);
        } else {
          // Handle LIMIT ? OFFSET ? with params
          const limitOffsetMatch = sql.match(/limit\s+\?\s+offset\s+\?/i);
          if (limitOffsetMatch && params.length >= 2) {
            const limit = params[0];
            const offset = params[1];
            rows = rows.slice(offset, offset + limit);
          }
        }
      }
      
      if (callback) callback(null, rows);
      return rows;
    } catch (err) {
      if (callback) callback(err);
      throw err;
    }
  }
};

module.exports = { db: dbWrapper, initDb };