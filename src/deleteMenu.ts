import inquirer from 'inquirer';
import axios from 'axios';
import { DeleteResult, FileResult, Metadata } from './types';
import { copy } from 'copy-paste';
import { pause } from "./utils";
import { uploadFiles } from "./uploadFiles";

// Delete an image using the deletehash
async function deleteImage (deletehash: string, clientId: string): Promise<DeleteResult> {
    try {
        const response = await axios.delete(`https://api.imgur.com/3/image/${deletehash}`, {
            headers: {
                'Authorization': `Client-ID ${clientId}`
            }
        });
        return {success: true, status: response.data.status};
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.data?.error || error.message
        };
    }
}

// Show deletion menu and handle user choices
async function showDeletionMenu (results: FileResult[], clientId: string, metadata?: Metadata | null): Promise<void> {
    let continueMenu = true;

    while (continueMenu) {
        // Only show deletion options if we have successful uploads
        const successfulUploads = results.filter(r => r.deletehash);
        const failedUploads = results.filter(r => r.error);

        if (successfulUploads.length === 0 && failedUploads.length === 0) {
            console.log('No uploads to manage.');
            await pause();
            return;
        }

        // Find invalid uploads where isValid is false
        const invalidUploads = successfulUploads.filter(r => r.isValid === false);

        // Build menu choices
        const menuChoices = [];

        // Add retry option if there are failed uploads
        if (failedUploads.length > 0) {
            menuChoices.push({
                name: `Retry failed uploads (${failedUploads.length})`,
                value: 'retryFailed'
            });
        }

        const validUploads = successfulUploads.filter(r => r.isValid);
        if (validUploads.length > 0) {
            menuChoices.push({ name: 'Copy valid links to clipboard', value: 'copyLinks' });
        }

        if (successfulUploads.length > 0) {
            menuChoices.push(
              { name: 'Delete all uploads', value: 'deleteAll' },
              { name: 'Select uploads to delete', value: 'selectDelete' }
            );

            // Add option to delete invalid uploads only if there are any
            if (invalidUploads.length > 0) {
                menuChoices.push({
                    name: `Delete invalid uploads (${invalidUploads.length})`,
                    value: 'deleteInvalid'
                });
            }
        }

        // Add quit option
        menuChoices.push({name: 'Quit', value: 'quit'});

        const {action} = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do with the uploaded images?',
                choices: menuChoices
            }
        ]);

        if (action === 'retryFailed') {
            // Prompt user to select which failed uploads to retry
            const { selectedToRetry } = await inquirer.prompt([
                {
                    type: 'checkbox',
                    name: 'selectedToRetry',
                    message: 'Select files to retry:',
                    choices: failedUploads.map((upload, i) => ({
                        name: `${i + 1}: ${upload.file}`,
                        value: upload.file
                    }))
                }
            ]);

            const toRetry = selectedToRetry as string[];
            if (toRetry.length > 0) {
                console.log('Retrying selected uploads...');
                console.log(`Retrying ${toRetry.length} files...`);

                // Remove selected failed uploads from results
                const failedIndices = toRetry.map(file =>
                  results.findIndex(r => r.file === file)
                );
                failedIndices.sort((a, b) => b - a).forEach(index => {
                    if (index !== -1) results.splice(index, 1);
                });

                // Retry uploading the selected files
                const retryResults = await uploadFiles(toRetry);

                // Add the retry results to the main results array
                results.push(...retryResults);

                console.log('Retry completed.');
            } else {
                console.log('No files selected for retry.');
            }
        } else if (action === 'deleteAll') {
            console.log('Deleting all uploads...');
            const deletedIndices: number[] = [];

            for (let i = 0; i < successfulUploads.length; i++) {
                const upload = successfulUploads[i];
                if (!upload.deletehash) continue;
                
                const result = await deleteImage(upload.deletehash, clientId);
                console.log(`${upload.link}: ${result.success ? 'Deleted' : `Failed - ${result.error}`}`);

                if (result.success) {
                    // Find the index in the original results array
                    const originalIndex = results.findIndex(r => r.deletehash === upload.deletehash);
                    if (originalIndex !== -1) {
                        deletedIndices.push(originalIndex);
                    }
                }
            }

            // Remove deleted items from results array in reverse order to avoid index shifting
            deletedIndices.sort((a, b) => b - a).forEach(index => {
                results.splice(index, 1);
            });

            if (results.length === 0) {
                console.log('All uploads deleted. Exiting menu.');
                continueMenu = false;
            }
        } else if (action === 'selectDelete') {
            const {toDelete} = await inquirer.prompt([
                {
                    type: 'checkbox',
                    name: 'toDelete',
                    message: 'Select images to delete:',
                    choices: successfulUploads.map((upload, i) => ({
                        name: `${i + 1}: ${upload.link}`,
                        value: upload.deletehash
                    }))
                }
            ]);

            if (toDelete.length > 0) {
                console.log('Deleting selected uploads...');
                const deletedIndices: number[] = [];

                for (const deletehash of toDelete) {
                    const upload = successfulUploads.find(u => u.deletehash === deletehash);
                    const result = await deleteImage(deletehash, clientId);
                    console.log(`${upload?.link}: ${result.success ? 'Deleted' : `Failed - ${result.error}`}`);

                    if (result.success) {
                        // Find the index in the original results array
                        const originalIndex = results.findIndex(r => r.deletehash === deletehash);
                        if (originalIndex !== -1) {
                            deletedIndices.push(originalIndex);
                        }
                    }
                }

                // Remove deleted items from results array in reverse order to avoid index shifting
                deletedIndices.sort((a, b) => b - a).forEach(index => {
                    results.splice(index, 1);
                });
            }
        } else if (action === 'deleteInvalid') {
            console.log('Deleting invalid uploads...');
            const deletedIndices: number[] = [];

            for (const upload of invalidUploads) {
                if (!upload.deletehash) continue;
                
                const result = await deleteImage(upload.deletehash, clientId);
                console.log(`${upload.link}: ${result.success ? 'Deleted' : `Failed - ${result.error}`}`);

                if (result.success) {
                    // Find the index in the original results array
                    const originalIndex = results.findIndex(r => r.deletehash === upload.deletehash);
                    if (originalIndex !== -1) {
                        deletedIndices.push(originalIndex);
                    }
                }
            }

            // Remove deleted items from results array in reverse order to avoid index shifting
            deletedIndices.sort((a, b) => b - a).forEach(index => {
                results.splice(index, 1);
            });
        } else if (action === 'copyLinks') {
            try {
                // Number of links per row when copying to clipboard (default: 5)
                const groupLinksBy = 5;

                // Format links as requested: links with newlines after each group
                const validLinks = validUploads.map(r => r.link);

                // Group links by the specified number per row
                let linkText = '';
                // if metadata is supplied add id to the text
                if (metadata) {
                    if (metadata.videoTitle) {
                        linkText += `${metadata.videoTitle}\n`;
                    }
                    if (metadata.videoUrl) {
                        linkText += `Source: <${metadata.videoUrl}>\n`;
                    }
                }
                for (let i = 0; i < validLinks.length; i++) {
                    // Add one link per row
                    linkText += validLinks[i] + '\n';
                    // After each groupLinksBy links, insert an additional newline
                    if ((i + 1) % groupLinksBy === 0) {
                        linkText += '\n';
                    }
                }

                copy(linkText.trim());
                console.log('Links copied to clipboard!');
            } catch (error: any) {
                console.error('Failed to copy links to clipboard:', error.message);
            }
        } else if (action === 'quit') {
            console.log('Exiting menu.');
            continueMenu = false;
        }

        // If not quitting, show a separator before the next menu iteration
        if (continueMenu) {
            console.log('\n' + '-'.repeat(40) + '\n');
        }
    }
}

export {showDeletionMenu};
