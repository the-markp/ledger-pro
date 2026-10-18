import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Serve static assets from Vite build output directory
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Health check endpoint for container orchestrators (Kubernetes / Docker healthcheck)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Single Page Application (SPA) fallback to index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(Number(PORT), HOST, () => {
  console.log(`🚀 LedgerPro containerized app is running on http://${HOST}:${PORT}`);
});
