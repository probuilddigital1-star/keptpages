import { logError, logInfo } from '../utils/errorHandler';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.use('/api', routes);

app.use((err, req, res, next) => {
  logError('APIServer', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

try {
  initDb();
  app.listen(PORT, () => {
    // console.log(`Server running on http://localhost:${PORT}`);
  });
} catch (err) {
  logError('APIServer.to', err);
  process.exit(1);
}