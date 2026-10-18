import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './server/apiRouter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8001;
const HOST = process.env.HOST || '0.0.0.0';

// Permissive CORS middleware for Android app, emulators, and reverse proxies
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// JSON body parsing with large payload limit for backups and base64 company logos
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health check endpoint for container orchestrators (Kubernetes / Docker healthcheck)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount the Backend REST API for Android Mobile App and Web SPA
app.use('/api', apiRouter);

// Serve static assets from Vite build output directory
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Single Page Application (SPA) fallback to index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(Number(PORT), HOST, () => {
  console.log(`🚀 LedgerPro Backend & Web Server is running on http://${HOST}:${PORT}`);
  console.log(`📱 Android API Endpoint available at http://${HOST}:${PORT}/api`);
});
