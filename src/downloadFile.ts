import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import { ProgressBars } from './types';
import { trimFileName } from './utils';

export interface DownloadResult {
  success: boolean;
  filePath?: string;
  error?: string;
  originalUrl: string;
}

/**
 * Parse an imgur URL to get the direct file URL
 */
export function parseImgurUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // Check if it's already a direct file URL (i.imgur.com)
    if (urlObj.hostname === 'i.imgur.com') {
      return url;
    }

    // Check if it's a post URL (imgur.com)
    if (urlObj.hostname === 'imgur.com') {
      const pathParts = urlObj.pathname.split('/');
      const postId = pathParts[pathParts.length - 1];

      // Remove any file extension from post ID if present
      const cleanPostId = postId.split('.')[0];

      // Try common video formats
      const videoFormats = ['mp4', 'webm', 'mov', 'avi', 'mkv'];

      // Return the most common format (mp4) - we'll try others if this fails
      return `https://i.imgur.com/${cleanPostId}.mp4`;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Get file extension from Content-Type header or URL
 */
function getFileExtension(contentType: string | undefined, url: string): string {
  // Try to get extension from Content-Type
  if (contentType) {
    const mimeToExt: { [key: string]: string } = {
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/quicktime': '.mov',
      'video/x-msvideo': '.avi',
      'video/x-matroska': '.mkv',
      'video/x-flv': '.flv',
      'video/x-ms-wmv': '.wmv',
      'video/mpeg': '.mpeg'
    };

    if (mimeToExt[contentType]) {
      return mimeToExt[contentType];
    }
  }

  // Fall back to extension from URL
  const urlPath = new URL(url).pathname;
  const ext = path.extname(urlPath);
  return ext || '.mp4'; // Default to .mp4 if no extension found
}

/**
 * Download a file from an imgur URL
 */
export async function downloadFile(
  url: string,
  progressBars: ProgressBars,
  timeout: number = 30000
): Promise<DownloadResult> {
  const directUrl = parseImgurUrl(url);

  if (!directUrl) {
    return {
      success: false,
      error: 'Invalid imgur URL format',
      originalUrl: url
    };
  }

  const bar = progressBars.create(100, 0, {
    filename: trimFileName(`Downloading ${path.basename(directUrl)}`),
    downloadedMB: 0,
    fileSizeMB: 0
  });

  try {
    // Use plain axios to bypass proxy settings and avoid rate limiting
    const response = await axios.get(directUrl, {
      responseType: 'stream',
      timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      onDownloadProgress: (progressEvent: any) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          const downloadedMB = (progressEvent.loaded / (1024 * 1024)).toFixed(2);
          const totalMB = (progressEvent.total / (1024 * 1024)).toFixed(2);

          bar.update(percent, {
            filename: trimFileName(`Downloading ${path.basename(directUrl)}`),
            downloadedMB: parseFloat(downloadedMB),
            fileSizeMB: parseFloat(totalMB)
          });
        }
      }
    });

    if (response.status !== 200) {
      bar.stop();
      return {
        success: false,
        error: `HTTP ${response.status}: Failed to download file`,
        originalUrl: url
      };
    }

    // Create temporary file
    const tempDir = os.tmpdir();
    const fileExtension = getFileExtension(response.headers['content-type'], directUrl);
    const fileName = `imgur_reupload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${fileExtension}`;
    const tempFilePath = path.join(tempDir, fileName);

    // Write file to disk
    const writer = fs.createWriteStream(tempFilePath);
    response.data.pipe(writer);

    return new Promise((resolve) => {
      writer.on('finish', () => {
        bar.update(100);
        bar.stop();
        resolve({
          success: true,
          filePath: tempFilePath,
          originalUrl: url
        });
      });

      writer.on('error', (error) => {
        bar.stop();
        // Clean up partial file
        try {
          fs.unlinkSync(tempFilePath);
        } catch {
          // Ignore cleanup errors
        }
        resolve({
          success: false,
          error: `Failed to write file: ${error.message}`,
          originalUrl: url
        });
      });
    });

  } catch (error: any) {
    bar.stop();

    // If the direct URL failed and it was a post URL, try other formats
    if (url !== directUrl && error.response?.status === 404) {
      const urlObj = new URL(url);
      if (urlObj.hostname === 'imgur.com') {
        const pathParts = urlObj.pathname.split('/');
        const postId = pathParts[pathParts.length - 1].split('.')[0];
        const videoFormats = ['webm', 'mov', 'avi', 'mkv', 'gif'];

        for (const format of videoFormats) {
          const alternativeUrl = `https://i.imgur.com/${postId}.${format}`;
          try {
            const result = await downloadFile(alternativeUrl, progressBars, timeout);
            if (result.success) {
              return result;
            }
          } catch {
            // Continue to next format
          }
        }
      }
    }

    return {
      success: false,
      error: error.response?.status === 404
        ? 'File not found on imgur'
        : `Download failed: ${error.message}`,
      originalUrl: url
    };
  }
}
