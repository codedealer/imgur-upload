import inquirer from 'inquirer';
import axios from 'axios';

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
    // Only show deletion options if we have successful uploads
    const successfulUploads = results.filter(r => r.deletehash);
    if (successfulUploads.length === 0) {
        return;
    }

    // Find invalid uploads where isValid is false
    const invalidUploads = successfulUploads.filter(r => r.isValid === false);

    // Build menu choices
    const menuChoices = [
        {name: 'Keep all uploads', value: 'keep'},
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
        for (const upload of successfulUploads) {
            const result = await deleteImage(upload.deletehash, clientId);
            console.log(`${upload.link}: ${result.success ? 'Deleted' : `Failed - ${result.error}`}`);
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
            for (const deletehash of toDelete) {
                const upload = successfulUploads.find(u => u.deletehash === deletehash);
                const result = await deleteImage(deletehash, clientId);
                console.log(`${upload.link}: ${result.success ? 'Deleted' : `Failed - ${result.error}`}`);
            }
        }
    } else if (action === 'deleteInvalid') {
        console.log('Deleting invalid uploads...');
        for (const upload of invalidUploads) {
            const result = await deleteImage(upload.deletehash, clientId);
            console.log(`${upload.link}: ${result.success ? 'Deleted' : `Failed - ${result.error}`}`);
        }
    }
}

export {showDeletionMenu};
