import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import FormData from 'form-data';
import crypto from 'crypto';
import multer from 'multer';
import { promisify } from 'util';

// Initialize multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });
const uploadSingle = promisify(upload.single('video'));

// Proxy authorization middleware
const PROXY_SECRET = process.env.PROXY_SECRET || crypto.randomBytes(32).toString('hex');

function validateProxyAuth(req: VercelRequest): { valid: boolean; error?: string } {
  const proxyAuth = req.headers['x-proxy-auth'] as string;

  if (!proxyAuth) {
    return { valid: false, error: 'Missing X-Proxy-Auth header' };
  }

  if (proxyAuth !== PROXY_SECRET) {
    console.log(`❌ Invalid proxy auth attempt: ${proxyAuth.substring(0, 8)}...`);
    return { valid: false, error: 'Invalid proxy authorization' };
  }

  return { valid: true };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Proxy-Auth');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST for upload
  if (req.method !== 'POST') {
    return res.status(405).json({
      data: { error: 'Method not allowed' },
      success: false,
      status: 405
    });
  }

  try {
    // Validate proxy authorization
    const authResult = validateProxyAuth(req);
    if (!authResult.valid) {
      return res.status(authResult.error === 'Missing X-Proxy-Auth header' ? 401 : 403).json({
        data: { error: authResult.error },
        success: false,
        status: authResult.error === 'Missing X-Proxy-Auth header' ? 401 : 403
      });
    }

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

    // Process multipart form data
    await uploadSingle(req as any, res as any);
    const file = (req as any).file;

    if (!file) {
      return res.status(400).json({
        data: { error: 'No file provided' },
        success: false,
        status: 400
      });
    }

    console.log(`Proxying upload request for client: ${clientId.substring(0, 8)}...`);
    console.log(`File size: ${file.size} bytes`);

    // Create form data for Imgur API
    const form = new FormData();
    form.append('video', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype
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
    return res.json(response.data);

  } catch (error: any) {
    console.error('Proxy upload error:', error.message);

    if (error.response?.data) {
      // Forward Imgur API error response
      return res.status(error.response.status || 500).json(error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      return res.status(408).json({
        data: { error: 'Request timeout' },
        success: false,
        status: 408
      });
    } else {
      return res.status(500).json({
        data: { error: 'Internal server error' },
        success: false,
        status: 500
      });
    }
  }
}
