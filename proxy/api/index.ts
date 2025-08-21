import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.json({
      service: 'Imgur API Proxy',
      version: '1.0.0',
      platform: 'vercel',
      endpoints: {
        upload: 'POST /api/3/image',
        delete: 'DELETE /api/3/image/[deleteHash]',
        health: 'GET /api/health'
      }
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
