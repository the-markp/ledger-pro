import express from 'express';
import { db } from './db.js';

export const apiRouter = express.Router();

// CORS & JSON middleware helper
apiRouter.use(express.json({ limit: '15mb' }));

// 1. Health & Server Info
apiRouter.get('/status', (req, res) => {
  res.json({
    status: 'online',
    app: 'LedgerPro',
    service: 'Backend API Service',
    version: '2.1.0',
    currency: db.data.currency || 'PHP',
    stats: {
      transactionsCount: db.data.transactions.length,
      usersCount: db.data.users.length,
      company: db.data.companyProfile.companyName
    },
    timestamp: new Date().toISOString()
  });
});

// 2. Authentication
apiRouter.post('/auth/login', (req, res) => {
  const { username, pin } = req.body || {};
  if (!username || !pin) {
    return res.status(400).json({ error: 'Username and PIN are required' });
  }

  const user = db.login(username, String(pin));
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or PIN' });
  }

  // Provide mock bearer token for API clients / Android app
  const token = `lp_token_${user.id}_${Date.now()}`;
  res.json({
    success: true,
    user,
    token,
    message: `Welcome back, ${user.fullName}`
  });
});

// 3. User Management
apiRouter.get('/users', (req, res) => {
  res.json(db.getUsers());
});

apiRouter.post('/users', (req, res) => {
  const { username, fullName, pin, role } = req.body || {};
  if (!username || !fullName) {
    return res.status(400).json({ error: 'Username and Full Name are required' });
  }
  const newUser = db.createUser({ username, fullName, pin, role });
  res.status(201).json(newUser);
});

apiRouter.put('/users/:id', (req, res) => {
  const updated = db.updateUser(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(updated);
});

apiRouter.delete('/users/:id', (req, res) => {
  const success = db.deleteUser(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ success: true, message: 'User deleted' });
});

apiRouter.put('/users/:id/pin', (req, res) => {
  const { newPin } = req.body || {};
  if (!newPin || String(newPin).length < 4) {
    return res.status(400).json({ error: 'PIN must be at least 4 digits' });
  }
  const success = db.updatePin(req.params.id, String(newPin));
  if (!success) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ success: true, message: 'PIN updated successfully' });
});

// 4. Transactions API
apiRouter.get('/transactions', (req, res) => {
  const { status, search } = req.query;
  const list = db.getTransactions({ status, search });
  res.json(list);
});

apiRouter.get('/transactions/:id', (req, res) => {
  const tx = db.getTransactionById(req.params.id);
  if (!tx) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.json(tx);
});

apiRouter.post('/transactions', (req, res) => {
  const { client, projectName, bill } = req.body || {};
  if (!client || !projectName || bill === undefined) {
    return res.status(400).json({ error: 'Client, Project Name, and Bill amount are required' });
  }
  const newTx = db.createTransaction(req.body);
  res.status(201).json(newTx);
});

apiRouter.put('/transactions/:id', (req, res) => {
  const updated = db.updateTransaction(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.json(updated);
});

apiRouter.delete('/transactions/:id', (req, res) => {
  const success = db.deleteTransaction(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.json({ success: true, message: 'Transaction deleted' });
});

apiRouter.patch('/transactions/:id/payment', (req, res) => {
  const { amountPaid, paymentMethod, paymentReference, paymentDate, remarks } = req.body || {};
  if (amountPaid === undefined || Number(amountPaid) <= 0) {
    return res.status(400).json({ error: 'A positive payment amount is required' });
  }
  const updated = db.recordPayment(req.params.id, {
    amountPaid: Number(amountPaid),
    paymentMethod,
    paymentReference,
    paymentDate,
    remarks
  });
  if (!updated) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.json(updated);
});

// 5. Company Branding Profile
apiRouter.get('/company', (req, res) => {
  res.json(db.getCompany());
});

apiRouter.put('/company', (req, res) => {
  const updated = db.updateCompany(req.body);
  res.json(updated);
});

// 6. Backup & Restore
apiRouter.get('/backup', (req, res) => {
  res.json(db.getBackup());
});

apiRouter.post('/restore', (req, res) => {
  try {
    db.restoreBackup(req.body);
    res.json({ success: true, message: 'System state restored successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/reset', (req, res) => {
  db.reset();
  res.json({ success: true, message: 'Database reset to default seed data' });
});
