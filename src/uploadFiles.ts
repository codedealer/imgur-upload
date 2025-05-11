import fs from "fs";
import { FileResult, UploadResult } from "./types";
import config from "./config";
import cliProgress from 'cli-progress';
import path from "path";
import { mockUploadFile } from "./mockUploadFile";
import { uploadFile } from "./uploadFile";

const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/x-matroska',
  'video/quicktime',
  'video/x-flv',
  'video/x-msvideo',
  'video/x-ms-wmv',
  'video/mpeg'
];

function validateFileType (filePath: string): boolean {
  const fileExt = path.extname(filePath).toLowerCase();
  let mimeType: string | null;

  switch (fileExt) {
    case '.mp4':
      mimeType = 'video/mp4';
      break;
    case '.webm':
      mimeType = 'video/webm';
      break;
    case '.mkv':
      mimeType = 'video/x-matroska';
      break;
    case '.mov':
    case '.qt':
      mimeType = 'video/quicktime';
      break;
    case '.flv':
      mimeType = 'video/x-flv';
      break;
    case '.avi':
      mimeType = 'video/x-msvideo';
      break;
    case '.wmv':
      mimeType = 'video/x-ms-wmv';
      break;
    case '.mpeg':
    case '.mpg':
      mimeType = 'video/mpeg';
      break;
    default:
      mimeType = null;
  }

  // Validate file is a supported video type
  if (!mimeType || !SUPPORTED_VIDEO_TYPES.includes(mimeType)) {
    console.error(`Error: ${path.basename(filePath)} Unsupported file type - ${fileExt}`);
    return false;
  }

  return true;
}

async function processFileUpload (file: string,
                                  progressBars: cliProgress.MultiBar,
                                  TIMEOUT: number,
                                  MAX_FILE_SIZE_MB: number,
                                  uploadFn: (...args: any) => Promise<UploadResult>): Promise<FileResult> {
  if (!fs.existsSync(file)) {
    console.error(`\nError: File not found - ${file}`);
    return { file, error: 'File not found' };
  }

  if (!validateFileType(file)) {
    return { file, error: 'Unsupported file type' };
  }

  const result = await uploadFn(file, progressBars, TIMEOUT, MAX_FILE_SIZE_MB);
  if (result.success) {
    console.log(`\nUpload success: ${result.link}`);
    return {
      file,
      link: result.link,
      id: result.id,
      deletehash: result.deletehash,
      isValid: true // Will be updated later if verification is enabled
    };
  } else {
    console.log(`\nUpload failed: ${result.error}`);
    return { file, error: result.error };
  }
}

async function uploadFiles (files: string[]) {
  const progressBars = new cliProgress.MultiBar({
    format: '{filename} | {bar} | {percentage}% | {uploadedMB}/{fileSizeMB} MB',
    hideCursor: true,
    clearOnComplete: false,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
  }, cliProgress.Presets.shades_grey);

  const TIMEOUT = config.uploadTimeout;
  const uploadFn = config.testMode ? mockUploadFile : uploadFile;
  const MAX_FILE_SIZE_MB = config.maxFileSizeMb;
  const hasFileSizeLimit = MAX_FILE_SIZE_MB > 0;

  console.log(`Upload timeout set to: ${TIMEOUT / 1000} seconds`);
  if (hasFileSizeLimit) {
    console.log(`Maximum file size: ${MAX_FILE_SIZE_MB} MB`);
  }

  // Replace the sequential for loop with this concurrent implementation
  const uploadQueue = [];
  let completedUploads = 0;
  const totalFiles = files.length;

  // Create upload promises for all files
  for (const file of files) {
    uploadQueue.push(async () => {
      let result: FileResult;
      try {
        result = await processFileUpload(file, progressBars, TIMEOUT, MAX_FILE_SIZE_MB, uploadFn);
      } catch (e) {
        result = { file, error: e instanceof Error ? e.message : 'Unknown error' };
      }
      completedUploads++;
      console.log(`Progress: ${completedUploads}/${totalFiles} files processed`);
      return result;
    });
  }

  // Process uploads with concurrency limit
  const results: FileResult[] = [];
  const concurrencyLimit = config.concurrentUploads;
  console.log(`Using concurrency limit: ${concurrencyLimit}`);

  // Process files in batches based on concurrency limit
  while (uploadQueue.length > 0) {
    const batch = uploadQueue.splice(0, concurrencyLimit);
    const batchResults = await Promise.all(batch.map(fn => fn()));
    results.push(...batchResults);

    if (batch.length < concurrencyLimit) {
      // If we took fewer items than the limit, we're done
      break;
    }
  }

  progressBars.stop();

  return results;
}

export { uploadFiles };
