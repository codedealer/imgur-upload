import inquirer from 'inquirer';
import axios from 'axios';
import clipboardy from 'clipboardy';

// Delete an image using the deletehash
async function deleteImage(deletehash, clientId) {
    try {
        const response = await axios.delete(`https://api.imgur.com/3/image/${deletehash}`, {
            headers: {
                'Authorization': `Client-ID ${clientId}`
            }
        });
        return {success: true, status: response.data.status};
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.data?.error || error.message
        };
    }
}

// Show deletion menu and handle user choices
async function showDeletionMenu(results, clientId) {
    let continueMenu = true;

    while (continueMenu) {
        // Only show deletion options if we have successful uploads
        const successfulUploads = results.filter(r => r.deletehash);
        if (successfulUploads.length === 0) {
            console.log('No uploads available for deletion.');
            return;
        }

        // Find invalid uploads where isValid is false
        const invalidUploads = successfulUploads.filter(r => r.isValid === false);

        // Build menu choices
        const menuChoices = [
            {name: 'Delete all uploads', value: 'deleteAll'},
            {name: 'Select uploads to delete', value: 'selectDelete'}
        ];

        // Add option to delete invalid uploads only if there are any
        if (invalidUploads.length > 0) {
            menuChoices.push({
                name: `Delete invalid uploads (${invalidUploads.length})`,
                value: 'deleteInvalid'
            });
        }

        if (successfulUploads.length > 0) {
            menuChoices.push({name: 'Copy all links to clipboard', value: 'copyLinks'});
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

        if (action === 'deleteAll') {
            console.log('Deleting all uploads...');
            const deletedIndices = [];

            for (let i = 0; i < successfulUploads.length; i++) {
                const upload = successfulUploads[i];
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
                const deletedIndices = [];

                for (const deletehash of toDelete) {
                    const upload = successfulUploads.find(u => u.deletehash === deletehash);
                    const result = await deleteImage(deletehash, clientId);
                    console.log(`${upload.link}: ${result.success ? 'Deleted' : `Failed - ${result.error}`}`);

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
            const deletedIndices = [];

            for (const upload of invalidUploads) {
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
                const linksPerRow = 5;

                // Format links as requested: links with newlines after each group
                const validLinks = results
                    .filter(r => r.link) // Only include results with a link
                    .map(r => r.link);   // Extract just the link

                // Group links by the specified number per row
                let linkText = '';
                for (let i = 0; i < validLinks.length; i++) {
                    linkText += validLinks[i];

                    // Add a newline after each group of linksPerRow or at the end
                    if ((i + 1) % linksPerRow === 0 || i === validLinks.length - 1) {
                        linkText += '\n';
                    } else {
                        linkText += ' ';
                    }
                }

                await clipboardy.write(linkText);
                console.log('Links copied to clipboard!');
            } catch (error) {
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
