require('dotenv').config();
const FormData = require('form-data');
const axios = require('axios');
const path = require('path');
const cliProgress = require('cli-progress');
const fs = require('fs');

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

async function uploadFile(filePath) {
    const bar = progressBars.create(100, 0, {
        filename: path.basename(filePath),
        uploadedMB: 0,
        fileSizeMB: 0
    });

    try {
        const form = new FormData();
        form.append('image', fs.createReadStream(filePath));
        form.append('type', 'file');

        const stats = fs.statSync(filePath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        const response = await axios.post('https://api.imgur.com/3/image', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Client-ID ${process.env.CLIENT_ID}`
            },
            timeout: TIMEOUT,
            onUploadProgress: (progressEvent) => {
                const percent = Math.round(
                    (progressEvent.loaded / progressEvent.total) * 100
                );

                bar.update(percent, {
                    uploadedMB: (percent / 100 * fileSizeMB).toFixed(2),
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
    } catch (error) {
        bar.stop();

        let errorMessage;
        if (error.code === 'ECONNABORTED') {
            errorMessage = `Timeout after ${TIMEOUT/1000}s`;
        } else {
            errorMessage = error.response?.data?.data?.error || error.message;
        }

        return {
            success: false,
            error: errorMessage
        };
    }
}

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

        const result = await uploadFile(file);
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

    console.log('\nResults:');
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.error) {
            console.log(`${i + 1}: ${result.file} - Error: ${result.error}`);
        } else {
            console.log(`${i + 1}: ${result.link}`);
        }
    }
    process.exit(exitCode);
})();
