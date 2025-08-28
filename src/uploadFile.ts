import path from "path";
import FormData from "form-data";
import fs from "fs";
import { ProgressBars, UploadResult } from "./types";
import config from "./config";
import { trimFileName } from "./utils";
import { axiosClient } from "./axiosClient";
import { signRequest, sha256Hex } from "./proxyAuth";
import fsPromises from 'fs/promises';
import crypto from 'crypto';

async function uploadFile (
  filePath: string,
  progressBars: ProgressBars,
  TIMEOUT: number = 30000,
  MAX_FILE_SIZE_MB: number = 0
): Promise<UploadResult> {
    const bar = progressBars.create(100, 0, {
        filename: trimFileName(path.basename(filePath)),
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

    const form = new FormData();
    form.append('video', fs.createReadStream(filePath));
    form.append('type', 'file');

        // Determine the upload URL based on proxy configuration
        const uploadUrl = config.gcProxy
            ? `${config.gcProxy}/3/image`
            : 'https://api.imgur.com/3/image';

        const headers: any = {
            ...form.getHeaders(),
            'Authorization': `Client-ID ${config.clientId}`
        };

        // Add proxy authentication if using proxy
        if (config.gcProxy && config.proxySecret) {
            if (config.proxyAuthMode === 'hmac') {
                const url = new URL(uploadUrl);
                const pathOnly = url.pathname; // e.g. /3/image
                // Compute SHA-256 of the file content for signing
                const fileBuffer = await fsPromises.readFile(filePath);
                const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
                const h = signRequest('default', config.proxySecret, 'POST', pathOnly, fileHash);
                headers['x-proxy-key-id'] = h['x-proxy-key-id'];
                headers['x-proxy-signature'] = h['x-proxy-signature'];
                headers['x-proxy-timestamp'] = h['x-proxy-timestamp'];
                headers['x-proxy-content-sha256'] = fileHash;
            } else {
                headers['X-Proxy-Auth'] = config.proxySecret;
            }
        }

        const response = await axiosClient.post(uploadUrl, form, {
            headers,
            timeout: TIMEOUT,
            onUploadProgress: (progressEvent: any) => {
                const total = progressEvent.total && progressEvent.total > 0 ? progressEvent.total : 1;
                const percent = Math.round(
                  (progressEvent.loaded / total) * 100
                );

                bar.update(percent, {
                    uploadedMB: (percent / 100 * parseFloat(fileSizeMB)).toFixed(2),
                    fileSizeMB: fileSizeMB
                });
            }
        });

        bar.stop();
        return {
            success: true,
            link: response.data.data.link,
            id: response.data.data.id,
            deletehash: response.data.data.deletehash,
        };
    } catch (error: any) {
        bar.stop();

        let errorMessage;
        if (error.code === 'ECONNABORTED') {
            errorMessage = `Timeout after ${TIMEOUT / 1000}s`;
        } else {
            errorMessage = error.response?.data?.data?.error || error.message;
        }

        return {
            success: false,
            error: errorMessage
        };
    }
}

export { uploadFile };
