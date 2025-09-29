import { logError, logInfo } from '../utils/errorHandler';

require('dotenv').config();
const { initDb } = require('./db');

try {
  initDb();
  // console.log('Database initialized successfully');
  process.exit(0);
} catch (err) {
  logError('Migration.database', err);
  process.exit(1);
}