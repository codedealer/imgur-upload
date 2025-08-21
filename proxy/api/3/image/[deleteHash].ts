import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import crypto from 'crypto';

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

  // Extract deleteHash from URL
  const { deleteHash } = req.query;

  if (!deleteHash || typeof deleteHash !== 'string') {
    return res.status(400).json({
      data: { error: 'Missing or invalid deleteHash parameter' },
      success: false,
      status: 400
    });
  }

  // Handle different HTTP methods
  if (req.method === 'DELETE') {
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
      return res.json(response.data);

    } catch (error: any) {
      console.error('Proxy delete error:', error.message);

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

  // Method not allowed
  return res.status(405).json({
    data: { error: 'Method not allowed' },
    success: false,
    status: 405
  });
}
