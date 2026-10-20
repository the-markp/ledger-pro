import express from 'express';
import { db } from './db.js';

export const apiRouter = express.Router();

// CORS & JSON middleware helper
apiRouter.use(express.json({ limit: '15mb' }));

// 1. Health & Server Info
apiRouter.get('/status', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json({
      status: 'online',
      app: 'LedgerPro',
      service: 'Backend API Service',
      version: '2.1.0',
      database: {
        type: db.isPostgresConnected ? 'PostgreSQL' : 'JSON File (Fallback)',
        status: 'connected',
        postgres: db.isPostgresConnected
      },
      currency: stats.currency || 'PHP',
      stats: {
        transactionsCount: stats.transactionsCount,
        usersCount: stats.usersCount,
        company: stats.companyName
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Authentication
apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { username, pin } = req.body || {};
    if (!username || !pin) {
      return res.status(400).json({ error: 'Username and PIN are required' });
    }
    const user = await db.login(username, String(pin));
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. User Management
apiRouter.get('/users', async (req, res) => {
  try {
    const users = await db.getUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/users', async (req, res) => {
  try {
    const { username, fullName, pin, role } = req.body || {};
    if (!username || !fullName) {
      return res.status(400).json({ error: 'Username and Full Name are required' });
    }
    const newUser = await db.createUser({ username, fullName, pin, role });
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/users/:id', async (req, res) => {
  try {
    const updated = await db.updateUser(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/users/:id', async (req, res) => {
  try {
    const success = await db.deleteUser(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/users/:id/pin', async (req, res) => {
  try {
    const { newPin } = req.body || {};
    if (!newPin || String(newPin).length < 4) {
      return res.status(400).json({ error: 'PIN must be at least 4 digits' });
    }
    const success = await db.updatePin(req.params.id, String(newPin));
    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, message: 'PIN updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Transactions API
apiRouter.get('/transactions', async (req, res) => {
  try {
    const { status, search } = req.query;
    const list = await db.getTransactions({ status, search });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/transactions/:id', async (req, res) => {
  try {
    const tx = await db.getTransactionById(req.params.id);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(tx);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/transactions', async (req, res) => {
  try {
    const { client, projectName, bill } = req.body || {};
    if (!client || !projectName || bill === undefined) {
      return res.status(400).json({ error: 'Client, Project Name, and Bill amount are required' });
    }
    const newTx = await db.createTransaction(req.body);
    res.status(201).json(newTx);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/transactions/:id', async (req, res) => {
  try {
    const updated = await db.updateTransaction(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/transactions/:id', async (req, res) => {
  try {
    const success = await db.deleteTransaction(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ success: true, message: 'Transaction deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/transactions/:id/payment', async (req, res) => {
  try {
    const { amountPaid, paymentMethod, paymentReference, paymentDate, remarks } = req.body || {};
    if (amountPaid === undefined || Number(amountPaid) <= 0) {
      return res.status(400).json({ error: 'A positive payment amount is required' });
    }
    const updated = await db.recordPayment(req.params.id, {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Company Branding Profile
apiRouter.get('/company', async (req, res) => {
  try {
    const company = await db.getCompany();
    res.json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/company', async (req, res) => {
  try {
    const updated = await db.updateCompany(req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Backup & Restore
apiRouter.get('/backup', async (req, res) => {
  try {
    const backup = await db.getBackup();
    res.json(backup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/backup/list', async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      return res.json({ backups: [], maxRetention: 10 });
    }
    const files = fs.readdirSync(backupDir)
      .filter((f) => f.startsWith('ledgerpro_backup_') && f.endsWith('.json'))
      .map((f) => {
        const fullPath = path.join(backupDir, f);
        const stats = fs.statSync(fullPath);
        return {
          filename: f,
          sizeKb: (stats.size / 1024).toFixed(2),
          createdAt: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ backups: files, maxRetention: 10 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/backup/automated', async (req, res) => {
  try {
    const { performBackup } = await import('../scripts/backup.js');
    const result = await performBackup();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/restore', async (req, res) => {
  try {
    await db.restoreBackup(req.body);
    res.json({ success: true, message: 'System state restored successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/reset', async (req, res) => {
  try {
    await db.reset();
    res.json({ success: true, message: 'Database reset to clean state' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
