import fs from 'fs';
import cliProgress from 'cli-progress';
import { downloadFile, DownloadResult } from './downloadFile';
import { uploadFiles } from './uploadFiles';
import { FileResult } from './types';
import config from './config';

export interface ReuploadResult {
  originalUrl: string;
  download: DownloadResult;
  upload?: FileResult;
}

/**
 * Check if a string is a valid imgur URL
 */
export function isImgurUrl(input: string): boolean {
  try {
    const url = new URL(input);
    return url.hostname === 'imgur.com' || url.hostname === 'i.imgur.com';
  } catch {
    return false;
  }
}

/**
 * Download files from imgur URLs and reupload them
 */
export async function reuploadFiles(urls: string[]): Promise<ReuploadResult[]> {
  const results: ReuploadResult[] = [];
  const downloadedFiles: string[] = [];

  console.log(`Starting reupload process for ${urls.length} URLs...`);

  // Create progress bars container for downloadFile to use
  const downloadProgressBars = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: true,
    format: 'Download |{bar}| {percentage}% | {filename} | {downloadedMB}/{fileSizeMB} MB'
  }, cliProgress.Presets.shades_classic);

  try {
    // Simple concurrency limiter implementation
    const concurrentLimit = config.concurrentUploads;

    for (let i = 0; i < urls.length; i += concurrentLimit) {
      const batch = urls.slice(i, i + concurrentLimit);

      const batchPromises = batch.map(async (url): Promise<ReuploadResult> => {
        try {
          const downloadResult = await downloadFile(url, downloadProgressBars, config.uploadTimeout);

          const result: ReuploadResult = {
            originalUrl: url,
            download: downloadResult
          };

          if (downloadResult.success && downloadResult.filePath) {
            downloadedFiles.push(downloadResult.filePath);
          }

          return result;
        } catch (error) {
          // Handle download exceptions gracefully
          console.warn(`Download failed for ${url}:`, error);
          return {
            originalUrl: url,
            download: {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown download error',
              originalUrl: url
            }
          };
        }
      });

      // Wait for this batch to complete before starting the next
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    downloadProgressBars.stop();

    // Filter successful downloads
    const successfulDownloads = downloadedFiles.filter(file => fs.existsSync(file));

    if (successfulDownloads.length === 0) {
      console.log('\nNo files were successfully downloaded.');
      return results;
    }

    console.log(`\nSuccessfully downloaded ${successfulDownloads.length} files. Starting uploads...`);

    // Upload the downloaded files
    const uploadResults = await uploadFiles(successfulDownloads);

    // Match upload results back to original URLs using a map keyed by file path
    const uploadMap = new Map<string, FileResult>();
    for (const uploadResult of uploadResults) {
      if (uploadResult.file) {
        uploadMap.set(uploadResult.file, uploadResult);
      }
    }

    // Map upload results back to reupload results
    for (const result of results) {
      if (result.download.success && result.download.filePath) {
        const uploadResult = uploadMap.get(result.download.filePath);
        if (uploadResult) {
          result.upload = uploadResult;
        }
      }
    }

    return results;

  } finally {
    // Clean up downloaded temporary files
    for (const filePath of downloadedFiles) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.warn(`Warning: Could not delete temporary file ${filePath}: ${error}`);
      }
    }

    downloadProgressBars.stop();
  }
}
