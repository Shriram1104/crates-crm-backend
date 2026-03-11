import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { pool, testConnection } from './utils/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import configRoutes from './routes/configRoutes.js';
import quoteRoutes from './routes/quoteRoutes.js';
import logRoutes from './routes/logRoutes.js';

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.APP_BASE_URL?.split(',') || '*', credentials: false }));
app.use(helmet());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

app.get('/api/health', async (_req, res) => {
  try {
    await testConnection();
    res.json({ ok: true, service: 'crates-crm-backend' });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/configs', configRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/logs', logRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, async () => {
  await testConnection().catch((error) => {
    console.error('DB connection failed:', error.message);
  });
  console.log(`Server running on http://localhost:${port}`);
});
