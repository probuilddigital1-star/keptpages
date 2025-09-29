import { logError, logInfo } from '../utils/errorHandler';

 const Database = require('better-sqlite3');
  const path = require('path');

  const dbPath = path.join(__dirname, '../../invoices.db');
  const db = new Database(dbPath);

  const initDb = () => {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS invoices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          number TEXT NOT NULL UNIQUE,
          clientName TEXT NOT NULL,
          clientEmail TEXT NOT NULL,
          clientAddress TEXT,
          items TEXT NOT NULL,
          dueDate TEXT NOT NULL,
          logo TEXT,
          notes TEXT,
          total REAL NOT NULL,
          status TEXT DEFAULT 'pending',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      // console.log('Database initialized successfully');
    } catch (err) {
      logError('DatabaseSQLite.to', err);
      throw err;
    }
  };

  // Wrapper functions to maintain sqlite3 API compatibility
  const dbWrapper = {
    run: (sql, params, callback) => {
      try {
        const info = db.prepare(sql).run(params || []);
        if (callback) callback.call({ lastID: info.lastInsertRowid, changes: info.changes }, null);
        return { lastID: info.lastInsertRowid, changes: info.changes };
      } catch (err) {
        if (callback) callback(err);
        throw err;
      }
    },

    get: (sql, params, callback) => {
      try {
        const row = db.prepare(sql).get(params || []);
        if (callback) callback(null, row);
        return row;
      } catch (err) {
        if (callback) callback(err);
        throw err;
      }
    },

    all: (sql, params, callback) => {
      try {
        const rows = db.prepare(sql).all(params || []);
        if (callback) callback(null, rows);
        return rows;
      } catch (err) {
        if (callback) callback(err);
        throw err;
      }
    }
  };

  module.exports = { db: dbWrapper, initDb };
