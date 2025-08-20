import express from 'express';
import multer from 'multer';
import cors from 'cors';
import axios from 'axios';
import FormData from 'form-data';
import crypto from 'crypto';

const app = express();
const upload = multer();

// Enable CORS for all routes
app.use(cors());

// Proxy authorization middleware
const PROXY_SECRET = process.env.PROXY_SECRET || crypto.randomBytes(32).toString('hex');

// Log the proxy secret on startup (only first 8 characters for security)
console.log(`Proxy Secret (first 8 chars): ${PROXY_SECRET.substring(0, 8)}...`);
console.log(`Set PROXY_SECRET environment variable or use: ${PROXY_SECRET.substring(0, 16)}...`);

function validateProxyAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const proxyAuth = req.headers['x-proxy-auth'] as string;

  if (!proxyAuth) {
    return res.status(401).json({
      data: { error: 'Missing X-Proxy-Auth header' },
      success: false,
      status: 401
    });
  }

  if (proxyAuth !== PROXY_SECRET) {
    console.log(`❌ Invalid proxy auth attempt: ${proxyAuth.substring(0, 8)}...`);
    return res.status(403).json({
      data: { error: 'Invalid proxy authorization' },
      success: false,
      status: 403
    });
  }

  next();
}

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Proxy upload endpoint - matches Imgur API structure
app.post('/3/image', validateProxyAuth, upload.single('video'), async (req, res) => {
  try {
    // Extract client ID from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Client-ID ')) {
      return res.status(401).json({
        data: { error: 'Missing or invalid Authorization header' },
        success: false,
        status: 401
      });
    }

    const clientId = authHeader.replace('Client-ID ', '');

    if (!req.file) {
      return res.status(400).json({
        data: { error: 'No file provided' },
        success: false,
        status: 400
      });
    }

    console.log(`Proxying upload request for client: ${clientId.substring(0, 8)}...`);
    console.log(`File size: ${req.file.size} bytes`);

    // Create form data for Imgur API
    const form = new FormData();
    form.append('video', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    form.append('type', 'file');

    // Forward request to Imgur API
    const response = await axios.post('https://api.imgur.com/3/image', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Client-ID ${clientId}`
      },
      timeout: 60000 // 60 second timeout for large files
    });

    console.log(`Upload successful for client: ${clientId.substring(0, 8)}...`);

    // Return Imgur's response directly
    res.json(response.data);

  } catch (error: any) {
    console.error('Proxy upload error:', error.message);

    if (error.response?.data) {
      // Forward Imgur API error response
      res.status(error.response.status || 500).json(error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      res.status(408).json({
        data: { error: 'Request timeout' },
        success: false,
        status: 408
      });
    } else {
      res.status(500).json({
        data: { error: 'Internal server error' },
        success: false,
        status: 500
      });
    }
  }
});

// Proxy delete endpoint
app.delete('/3/image/:deleteHash', validateProxyAuth, async (req, res) => {
  try {
    const { deleteHash } = req.params;

    // Extract client ID from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Client-ID ')) {
      return res.status(401).json({
        data: { error: 'Missing or invalid Authorization header' },
        success: false,
        status: 401
      });
    }

    const clientId = authHeader.replace('Client-ID ', '');

    console.log(`Proxying delete request for client: ${clientId.substring(0, 8)}... hash: ${deleteHash}`);

    // Forward delete request to Imgur API
    const response = await axios.delete(`https://api.imgur.com/3/image/${deleteHash}`, {
      headers: {
        'Authorization': `Client-ID ${clientId}`
      },
      timeout: 30000
    });

    console.log(`Delete successful for hash: ${deleteHash}`);

    // Return Imgur's response directly
    res.json(response.data);

  } catch (error: any) {
    console.error('Proxy delete error:', error.message);

    if (error.response?.data) {
      // Forward Imgur API error response
      res.status(error.response.status || 500).json(error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      res.status(408).json({
        data: { error: 'Request timeout' },
        success: false,
        status: 408
      });
    } else {
      res.status(500).json({
        data: { error: 'Internal server error' },
        success: false,
        status: 500
      });
    }
  }
});

// General health/info endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Imgur API Proxy',
    version: '1.0.0',
    endpoints: {
      upload: 'POST /3/image',
      delete: 'DELETE /3/image/:deleteHash',
      health: 'GET /health'
    }
  });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Imgur proxy server running on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/health`);
});

export default app;
