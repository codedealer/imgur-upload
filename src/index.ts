import readline from 'readline';
import { showDeletionMenu } from './deleteMenu';
import { verifyImgurLink } from "./verifyImgurLink";
import { pause } from './utils';
import config from './config';
import { uploadFiles } from "./uploadFiles";
import { getMetadata } from "./getMetadata";
import { reuploadFiles, isImgurUrl } from "./reuploadFiles";

async function collectUrlsInteractively(): Promise<string[]> {
    console.log('=================================');
    console.log('     IMGUR REUPLOAD UTILITY');
    console.log('=================================');
    console.log('');
    console.log('Enter Imgur URLs for reupload:');
    console.log('• Paste URLs separated by spaces or on separate lines');
    console.log('• Supported: https://imgur.com/abc123 or https://i.imgur.com/abc123.mp4');
    console.log('• Press Enter when done');
    console.log('');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const urls: string[] = [];

    return new Promise((resolve) => {
        console.log('Paste your URLs:');

        rl.on('line', (input) => {
            const trimmed = input.trim();

            if (trimmed === '') {
                // Empty line means we're done
                rl.close();
                return;
            }

            // Split by spaces and newlines, filter out empty strings
            const inputUrls = trimmed.split(/\s+/).filter(url => url.length > 0);

            for (const url of inputUrls) {
                if (isImgurUrl(url)) {
                    urls.push(url);
                    console.log(`✓ Added: ${url}`);
                } else {
                    console.log(`✗ Invalid URL (skipped): ${url}`);
                }
            }
        });

        rl.on('close', () => {
            if (urls.length === 0) {
                console.log('\nNo valid URLs provided. Exiting.');
                process.exit(1);
            }

            console.log(`\nCollected ${urls.length} valid URL(s). Starting reupload...`);
            resolve(urls);
        });
    });
}

(async () => {
    let exitCode = 0;

    if (!config.clientId) {
        console.error('Error: CLIENT_ID not found in configuration');
        await pause();
        process.exit(2);
    }

    const files = process.argv.slice(2);

    // Check for interactive reupload mode
    if (files.includes('--interactive-reupload')) {
        const imgurUrls = await collectUrlsInteractively();

        const reuploadResults = await reuploadFiles(imgurUrls);

        // Convert reupload results to the standard format for consistency
        const results = reuploadResults.map(result => ({
            file: result.originalUrl,
            link: result.upload?.link,
            id: result.upload?.id,
            deletehash: result.upload?.deletehash,
            error: result.download.error || result.upload?.error,
            isValid: true // Will be set during verification
        }));

        // Verification logic
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

        // Show results
        console.log('\nReupload Results:');
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
            await showDeletionMenu(results, config.clientId, null);
        } else {
            await pause();
        }

        process.exit(exitCode);
    }

    // Check if we're in reupload mode (all arguments are imgur URLs)
    const imgurUrls = files.filter(file => isImgurUrl(file));
    const isReuploadMode = imgurUrls.length > 0 && imgurUrls.length === files.length;

    if (isReuploadMode) {
        console.log('Reupload mode detected - processing imgur URLs...');

        const reuploadResults = await reuploadFiles(imgurUrls);

        // Convert reupload results to the standard format for consistency
        const results = reuploadResults.map(result => ({
            file: result.originalUrl,
            link: result.upload?.link,
            id: result.upload?.id,
            deletehash: result.upload?.deletehash,
            error: result.download.error || result.upload?.error,
            isValid: true // Will be set during verification
        }));

        // Verification logic
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

        // Show results
        console.log('\nReupload Results:');
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
            await showDeletionMenu(results, config.clientId, null);
        } else {
            await pause();
        }

        process.exit(exitCode);
    }

    // Normal file upload mode
    // catch json files
    const videoFiles = files.filter(file => !file.toLowerCase().endsWith('.json'));
    if (videoFiles.length === 0) {
        console.error('Error: No files provided');
        console.log('Usage: drag files onto the executable or');
        console.log('       run from command line: uploader.exe file1.mp4 file2.mov');
        console.log('       or for reupload: uploader.exe https://imgur.com/example https://i.imgur.com/example.mp4');
        await pause();
        process.exit(1);
    }

    const jsonFiles = files.filter(file => file.toLowerCase().endsWith('.json'));
    if (jsonFiles.length > 1) {
        console.warn('Multiple JSON files provided. Only the first one will be used.');
    }
    const jsonFile = jsonFiles.length > 0 ? jsonFiles[0] : null;
    const metadata = jsonFile ? getMetadata(jsonFile) : null;

    if (metadata) {
        if (metadata.videoUrl) {
            console.log(`Video URL: ${metadata.videoUrl}`);
        }
        if (metadata.videoTitle) {
            console.log(`Video Title: ${metadata.videoTitle}`);
        }
        if (metadata.titleSuffix) {
            console.log(`Title Suffix: ${metadata.titleSuffix}`);
        }
    }

    const results = await uploadFiles(videoFiles);

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
        await showDeletionMenu(results, config.clientId, metadata);
    } else {
        await pause();
    }

    process.exit(exitCode);
})();
