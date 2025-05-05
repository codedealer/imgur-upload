import 'dotenv/config';
import path from 'path';
import cliProgress from 'cli-progress';
import fs from 'fs';
import {showDeletionMenu} from './deleteMenu.js';
import {uploadFile} from './uploadFile.js';
import {mockUploadFile} from './mockUploadFile.js';
import {verifyImgurLink} from "./verifyImgurLink.js";

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

// Validate configuration
if (!process.env.CLIENT_ID) {
    console.error('Error: CLIENT_ID not found in .env file');
    process.exit(2);
}

const TIMEOUT = parseInt(process.env.UPLOAD_TIMEOUT) || 30000;
const uploadFn = process.env.TEST_MODE === 'true' ? mockUploadFile : uploadFile;

function validateFileType(filePath) {
    const fileExt = path.extname(filePath).toLowerCase();
    let mimeType;

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
    const files = process.argv.slice(2);
    let exitCode = 0;

    if (files.length === 0) {
        console.error('Error: No files provided');
        console.log('Usage: drag files onto the executable or');
        console.log('       run from command line: uploader.exe file1.mp4 file2.mov');
        process.exit(1);
    }

    console.log(`Upload timeout set to: ${TIMEOUT/1000} seconds`);

    const results = [];
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

        const result = await uploadFn(file, progressBars, TIMEOUT);
        if (result.success) {
            console.log(`\nUpload success: ${result.link}`);
            results.push({ file, link: result.link, id: result.id, deletehash: result.deletehash });
        } else {
            console.log(`\nUpload failed: ${result.error}`);
            exitCode = 1;
            results.push({ file, error: result.error });
        }
    }

    progressBars.stop();

    if (process.env.VERIFY_UPLOAD === 'true' && !results.every(r => r.error)) {
        console.log('\nVerifying uploads...');
        for (const result of results) {
            result.isValid = false;

            if (result.link) {
                result.isValid = await verifyImgurLink(result.id);
            }
        }
    } else if (process.env.VERIFY_UPLOAD !== 'true') {
        results.forEach(result => {
            if (result.deletehash) {
                result.isValid = true;
            }
        });
    }

    console.log('\nResults:');
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.error) {
            console.log(`${i + 1}: ${result.file} - Error: ${result.error}`);
        } else {
            console.log(`${result.isValid ? i + 1 : 'x'}: ${result.link}`);
        }
    }

    // Show the deletion menu
    await showDeletionMenu(results, process.env.CLIENT_ID);

    process.exit(exitCode);
})();
