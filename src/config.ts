import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

export interface ImgurConfig {
  clientId: string;
  uploadTimeout: number;
  verifyUpload: boolean;
  maxFileSizeMb: number;
  testMode: boolean;
  concurrentUploads: number;
  gcProxy?: string;
  proxySecret?: string;
}

let configCache: ImgurConfig | null = null;

export function loadConfig (): ImgurConfig {
  // If config is already loaded, return it
  if (configCache) {
    return configCache;
  }

  // Configure environment variables - always load .env files
  // Environment variables take precedence over .env file values
  if (process.env.NODE_ENV === 'production') {
    // In production, look for .env in the same directory as the compiled script
    dotenv.config({ path: path.join(__dirname, '.env') });
  } else {
    // In development, try .env
    dotenv.config();
  }

  const isPackaged = !!('pkg' in process || process.versions.pkg);
  let config: Partial<ImgurConfig> = {};

  // Try to load from config file if packaged
  if (isPackaged) {
    try {
      const execDir = path.dirname(process.execPath);
      const configPath = path.join(execDir, 'imgur-config.json');
      if (fs.existsSync(configPath)) {
        const fileContent = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(fileContent);
        console.log('Loaded configuration from imgur-config.json');
      } else {
        // Create default config file
        const defaultConfig: ImgurConfig = {
          clientId: "",
          uploadTimeout: 30000,
          verifyUpload: false,
          maxFileSizeMb: 0,
          testMode: false,
          concurrentUploads: 1,
          gcProxy: undefined,
          proxySecret: undefined,
        };
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
        console.log(`Default configuration file created at ${configPath}. Please update it with correct values.`);
        config = defaultConfig;
      }
    } catch (error) {
      console.error('Error loading config file:', error);
    }
  }

  // Fall back to environment variables for any missing options
  configCache = {
    clientId: config.clientId || process.env.CLIENT_ID || '',
    uploadTimeout: config.uploadTimeout || parseInt(process.env.UPLOAD_TIMEOUT || '30000'),
    verifyUpload: config.verifyUpload !== undefined
      ? config.verifyUpload
      : process.env.VERIFY_UPLOAD === 'true',
    maxFileSizeMb: config.maxFileSizeMb || parseInt(process.env.MAX_FILE_SIZE_MB || '0'),
    testMode: config.testMode !== undefined
      ? config.testMode
      : process.env.TEST_MODE === 'true',
    concurrentUploads: Math.max(1, config.concurrentUploads || parseInt(process.env.CONCURRENT_UPLOADS || '1')),
    gcProxy: config.gcProxy || process.env.GC_PROXY || undefined,
    proxySecret: config.proxySecret || process.env.PROXY_SECRET || undefined,
  };

  return configCache;
}

// Lazy-loaded config using a getter
const config = {
  get clientId() { return loadConfig().clientId; },
  get uploadTimeout() { return loadConfig().uploadTimeout; },
  get verifyUpload() { return loadConfig().verifyUpload; },
  get maxFileSizeMb() { return loadConfig().maxFileSizeMb; },
  get testMode() { return loadConfig().testMode; },
  get concurrentUploads() { return loadConfig().concurrentUploads; },
  get gcProxy() { return loadConfig().gcProxy; },
  get proxySecret() { return loadConfig().proxySecret; },
};

export default config;
