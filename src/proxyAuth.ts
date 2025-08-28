import crypto from 'crypto';

export interface HmacHeaders {
  'x-proxy-key-id': string;
  'x-proxy-signature': string;
  'x-proxy-timestamp': string;
}

// Create HMAC signature over canonical string
// canonical = method + "\n" + path + "\n" + timestamp + "\n" + sha256(body)
export function signRequest(
  keyId: string,
  secret: string,
  method: string,
  path: string,
  bodyHash: string,
  timestamp?: number,
): HmacHeaders {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const canonical = `${method.toUpperCase()}\n${path}\n${ts}\n${bodyHash}`;
  const sig = crypto.createHmac('sha256', secret).update(canonical).digest('hex');
  return {
    'x-proxy-key-id': keyId,
    'x-proxy-signature': sig,
    'x-proxy-timestamp': String(ts),
  };
}

export function sha256Hex(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
