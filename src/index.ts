import 'dotenv/config';
import { showDeletionMenu } from './deleteMenu';
import { verifyImgurLink } from "./verifyImgurLink";
import { pause } from './utils';
import config from './config';
import { uploadFiles } from "./uploadFiles";
import { getMetadata } from "./getMetadata";
import { reuploadFiles, isImgurUrl } from "./reuploadFiles";

(async () => {
    let exitCode = 0;

    if (!config.clientId) {
        console.error('Error: CLIENT_ID not found in configuration');
        await pause();
        process.exit(2);
    }

    const files = process.argv.slice(2);

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
