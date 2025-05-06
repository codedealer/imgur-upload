import path from "path";
import fs from "fs";
import { ProgressBars, UploadResult } from "./types";

/**
 * Mock implementation of the upload function for testing
 */
async function mockUploadFile (
  filePath: string,
  progressBars: ProgressBars,
  TIMEOUT: number = 30000,
  MAX_FILE_SIZE_MB: number = 0
): Promise<UploadResult> {
  const bar = progressBars.create(100, 0, {
    filename: path.basename(filePath),
    uploadedMB: 0,
    fileSizeMB: 0
  });

  try {
    const stats = fs.statSync(filePath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    // Check file size limit if specified
    if (MAX_FILE_SIZE_MB > 0 && parseFloat(fileSizeMB) > MAX_FILE_SIZE_MB) {
      bar.stop();
      return {
        success: false,
        error: `File exceeds maximum size of ${MAX_FILE_SIZE_MB} MB`
      };
    }

    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      bar.update(i, {
        uploadedMB: (i / 100 * parseFloat(fileSizeMB)).toFixed(2),
        fileSizeMB: fileSizeMB
      });

      // Slow down the mock to make it look more realistic
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    bar.stop();

    // Return mock success data
    const mockId = 'mock' + Math.random().toString(36).substring(2, 8);
    return {
      success: true,
      link: `https://i.imgur.com/${mockId}.mp4`,
      id: mockId,
      deletehash: 'mock' + Math.random().toString(36).substring(2, 10),
    };
  } catch (error: any) {
    bar.stop();

    return {
      success: false,
      error: error.message
    };
  }
}

export { mockUploadFile };
