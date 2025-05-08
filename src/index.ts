import 'dotenv/config';
import path from 'path';
import cliProgress from 'cli-progress';
import fs from 'fs';
import { showDeletionMenu } from './deleteMenu';
import { uploadFile } from './uploadFile';
import { mockUploadFile } from './mockUploadFile';
import { verifyImgurLink } from "./verifyImgurLink";
import { FileResult } from './types';
import { pause } from './utils';
import config from './config';

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

// Create progress bar container
const progressBars = new cliProgress.MultiBar({
    format: '{filename} | {bar} | {percentage}% | {uploadedMB}/{fileSizeMB} MB',
    hideCursor: true,
    clearOnComplete: false,
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
}, cliProgress.Presets.shades_grey);

function validateFileType (filePath: string): boolean {
    const fileExt = path.extname(filePath).toLowerCase();
    let mimeType: string | null;

    switch (fileExt) {
        case '.mp4': mimeType = 'video/mp4'; break;
        case '.webm': mimeType = 'video/webm'; break;
        case '.mkv': mimeType = 'video/x-matroska'; break;
        case '.mov': case '.qt': mimeType = 'video/quicktime'; break;
        case '.flv': mimeType = 'video/x-flv'; break;
        case '.avi': mimeType = 'video/x-msvideo'; break;
        case '.wmv': mimeType = 'video/x-ms-wmv'; break;
        case '.mpeg': case '.mpg': mimeType = 'video/mpeg'; break;
        default: mimeType = null;
    }

    // Validate file is a supported video type
    if (!mimeType || !SUPPORTED_VIDEO_TYPES.includes(mimeType)) {
        console.error(`Error: ${path.basename(filePath)} Unsupported file type - ${fileExt}`);
        return false;
    }

    return true;
}

(async () => {
    let exitCode = 0;

    if (!config.clientId) {
        console.error('Error: CLIENT_ID not found in configuration');
        await pause();
        process.exit(2);
    }

    const files = process.argv.slice(2);

    if (files.length === 0) {
        console.error('Error: No files provided');
        console.log('Usage: drag files onto the executable or');
        console.log('       run from command line: uploader.exe file1.mp4 file2.mov');
        await pause();
        process.exit(1);
    }

    const TIMEOUT = config.uploadTimeout;
    const uploadFn = config.testMode ? mockUploadFile : uploadFile;
    const MAX_FILE_SIZE_MB = config.maxFileSizeMb;
    const hasFileSizeLimit = MAX_FILE_SIZE_MB > 0;

    console.log(`Upload timeout set to: ${TIMEOUT/1000} seconds`);
    if (hasFileSizeLimit) {
        console.log(`Maximum file size: ${MAX_FILE_SIZE_MB} MB`);
    }

    const results: FileResult[] = [];
    for (const file of files) {
        if (!fs.existsSync(file)) {
            console.error(`\nError: File not found - ${file}`);
            exitCode = 1;
            results.push({ file, error: 'File not found' });
            continue;
        }
        if (!validateFileType(file)) {
            results.push({ file, error: 'Unsupported file type' });
            continue;
        }

        const result = await uploadFn(file, progressBars, TIMEOUT, MAX_FILE_SIZE_MB);
        if (result.success) {
            console.log(`\nUpload success: ${result.link}`);
            results.push({
                file,
                link: result.link,
                id: result.id,
                deletehash: result.deletehash,
                isValid: true // Will be updated later if verification is enabled
            });
        } else {
            console.log(`\nUpload failed: ${result.error}`);
            exitCode = 1;
            results.push({ file, error: result.error });
        }
    }

    progressBars.stop();

    if (config.verifyUpload && results.some(r => r.link)) {
        console.log('\nVerifying uploads...');
        if (config.testMode) {
            console.log('Test mode: Skipping verification');
        } else {
            for (const result of results) {
                if (result.link && result.id) {
                    result.isValid = await verifyImgurLink(result.id);
                }
            }
        }
    }

    console.log('\nResults:');
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.error) {
            console.log(`${i + 1}: ${result.file} - Error: ${result.error}`);
        } else {
            console.log(`${result.isValid ? i + 1 : 'x'}: ${result.link}${result.isValid ? '' : ' - Invalid'}`);
        }
    }

    // Show the deletion menu
    if (config.clientId) {
        await showDeletionMenu(results, config.clientId);
    } else {
        await pause();
    }

    process.exit(exitCode);
})();
