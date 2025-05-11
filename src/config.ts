import fs from 'fs';
import path from 'path';

export interface ImgurConfig {
  clientId: string;
  uploadTimeout: number;
  verifyUpload: boolean;
  maxFileSizeMb: number;
  testMode: boolean;
  concurrentUploads: number;
}

export function loadConfig (): ImgurConfig {
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
  return {
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
  };
}

// Default export for convenience
export default loadConfig();
