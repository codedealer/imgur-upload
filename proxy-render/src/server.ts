import express from 'express';
import multer from 'multer';
import axios from 'axios';
import crypto from 'crypto';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const PORT = process.env.PORT || 10000;
const PROXY_SECRET = process.env.PROXY_SECRET || '';
const PROXY_AUTH_MODE = (process.env.PROXY_AUTH_MODE || 'header') as 'header' | 'hmac';

function sha256Hex(buf: Buffer | string): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function verifyHmac(req: express.Request, bodyHash: string): boolean {
  const keyId = req.header('x-proxy-key-id');
  const sig = req.header('x-proxy-signature');
  const ts = req.header('x-proxy-timestamp');
  const contentHash = req.header('x-proxy-content-sha256');

  if (!keyId || !sig || !ts || !contentHash) return false;
  if (!/^[0-9]+$/.test(ts)) return false;
  const tsNum = parseInt(ts, 10);
  const now = Math.floor(Date.now() / 1000);
  // 5 minute skew
  if (Math.abs(now - tsNum) > 300) return false;

  // Ensure provided content hash matches the computed one
  if (contentHash !== bodyHash) return false;

  const canonical = `${req.method.toUpperCase()}\n${req.path}\n${ts}\n${bodyHash}`;
  const expected = crypto.createHmac('sha256', PROXY_SECRET).update(canonical).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Proxy-Auth, x-proxy-key-id, x-proxy-signature, x-proxy-timestamp, x-proxy-content-sha256');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', platform: 'render', mode: PROXY_AUTH_MODE });
});

app.post('/3/image', upload.single('video'), async (req, res) => {
  try {
    // Auth
    if (PROXY_AUTH_MODE === 'hmac') {
      const file = req.file;
      if (!file) return res.status(400).json({ data: { error: 'No file provided' }, success: false, status: 400 });
      const bodyHash = sha256Hex(file.buffer);
      if (!verifyHmac(req, bodyHash)) {
        return res.status(403).json({ data: { error: 'Invalid signature' }, success: false, status: 403 });
      }
    } else {
      const header = req.header('X-Proxy-Auth');
      if (!header || header !== PROXY_SECRET) {
        return res.status(header ? 403 : 401).json({ data: { error: header ? 'Invalid proxy authorization' : 'Missing X-Proxy-Auth header' }, success: false, status: header ? 403 : 401 });
      }
    }

    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Client-ID ')) {
      return res.status(401).json({ data: { error: 'Missing or invalid Authorization header' }, success: false, status: 401 });
    }
    const clientId = authHeader.replace('Client-ID ', '');

    const file = req.file;
    if (!file) return res.status(400).json({ data: { error: 'No file provided' }, success: false, status: 400 });

    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('video', file.buffer, { filename: file.originalname, contentType: file.mimetype });
    form.append('type', 'file');

    const response = await axios.post('https://api.imgur.com/3/image', form, {
      headers: { ...form.getHeaders(), Authorization: `Client-ID ${clientId}` },
      timeout: 60000,
    });

    res.json(response.data);
  } catch (err: any) {
    if (err.response?.data) return res.status(err.response.status || 500).json(err.response.data);
    if (err.code === 'ECONNABORTED') return res.status(408).json({ data: { error: 'Request timeout' }, success: false, status: 408 });
    res.status(500).json({ data: { error: 'Internal server error' }, success: false, status: 500 });
  }
});

app.delete('/3/image/:deleteHash', async (req, res) => {
  try {
    if (PROXY_AUTH_MODE === 'hmac') {
      const bodyHash = sha256Hex('');
      if (!verifyHmac(req, bodyHash)) {
        return res.status(403).json({ data: { error: 'Invalid signature' }, success: false, status: 403 });
      }
    } else {
      const header = req.header('X-Proxy-Auth');
      if (!header || header !== PROXY_SECRET) {
        return res.status(header ? 403 : 401).json({ data: { error: header ? 'Invalid proxy authorization' : 'Missing X-Proxy-Auth header' }, success: false, status: header ? 403 : 401 });
      }
    }

    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Client-ID ')) {
      return res.status(401).json({ data: { error: 'Missing or invalid Authorization header' }, success: false, status: 401 });
    }
    const clientId = authHeader.replace('Client-ID ', '');

    const { deleteHash } = req.params;
    const response = await axios.delete(`https://api.imgur.com/3/image/${deleteHash}`, {
      headers: { Authorization: `Client-ID ${clientId}` },
      timeout: 30000,
    });
    res.json(response.data);
  } catch (err: any) {
    if (err.response?.data) return res.status(err.response.status || 500).json(err.response.data);
    if (err.code === 'ECONNABORTED') return res.status(408).json({ data: { error: 'Request timeout' }, success: false, status: 408 });
    res.status(500).json({ data: { error: 'Internal server error' }, success: false, status: 500 });
  }
});

app.listen(PORT, () => {
  console.log(`Imgur proxy running on port ${PORT}`);
});
