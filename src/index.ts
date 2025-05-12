import 'dotenv/config';
import { showDeletionMenu } from './deleteMenu';
import { verifyImgurLink } from "./verifyImgurLink";
import { pause } from './utils';
import config from './config';
import { uploadFiles } from "./uploadFiles";
import { getMetadata } from "./getMetadata";

(async () => {
    let exitCode = 0;

    if (!config.clientId) {
        console.error('Error: CLIENT_ID not found in configuration');
        await pause();
        process.exit(2);
    }

    const files = process.argv.slice(2);

    // catch json files
    const videoFiles = files.filter(file => !file.toLowerCase().endsWith('.json'));
    if (videoFiles.length === 0) {

        console.error('Error: No files provided');
        console.log('Usage: drag files onto the executable or');
        console.log('       run from command line: uploader.exe file1.mp4 file2.mov');
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
